/* ══ WALLET & BENEFITS (FR-WB v1.1 + decisions of 05 Nov 2026) ═══════════════
   Time & Pay → Expense Management → Wallet & Benefits. One page, seven tabs
   (the Employees Direct/Global pattern, buildModuleTabsHTML):

     Wallets · Categories · Policies · Entitlements · Allocations · Overrides ·
     Tax Thresholds

   Every tab is the standard listing kit - lpSearchField + apCS filters,
   listing-stats tiles, an .lp-table in an .lp-split-wrap, the .lp-isb panel
   (sbHero, axField, lpLogsView, sbHistoryHTML) and a .ct-modal--form popup for
   + Add - exactly as Capping Limit (js/capping-limit.js) is built.

   WHAT THIS MODULE IS NOT. It configures who is entitled to what. It never
   creates a bank wallet, loads money, or shows a balance: a planned allocation
   is an internal record ("Planned - not yet loaded"), because the bank is the
   source of truth for money (ONC PRD principle 3).

   THE RULES, AS DECIDED
   - Precedence: Override > Employee > Designation > Department > Entity. The
     highest applicable level decides; lower amounts are never added.
   - Two policies at the same level for the same person, category and dates
     are a conflict: activation is refused, and at run time the person shows
     "Conflict" and is left out of allocation until it is resolved.
   - No proration. The 15th-of-month rule decides eligibility: joined on or
     before the 15th = eligible that month; leaving on or before the 15th =
     not eligible. Annual policies are tested on the 15th of the first month
     of their year; one-time (occasion) policies on the occasion date.
   - Phase 1 population: Direct (India) employees, Active (including people
     serving notice up to their last working date). Global/EOR excluded.
   - Designation only (no Grade master yet); designations carry an empty grade
     slot in Company Structure for Phase 2.
   - An Active policy's money fields are locked: a change is a new VERSION
     with an effective-from date; the earlier version is end-dated.
   - Allocation batches need a checker: Planned → Pending Approval → Approved
     (locked) or Rejected. The person who generated a batch cannot approve it.
   - Tax thresholds are advisory, effective-dated, and only count once Finance
     has approved them (maker ≠ checker).
   - Employee exit flags planned allocations; a batch with flagged rows cannot
     be approved until they are cancelled or recalculated.

   WHO "I" AM. ADT stamps every log with one constant user; maker-checker
   needs two people, so this module maps the topbar role to a person
   (Roles & Access, via js/ems-access.js) and checks permissions from the RBAC
   "Benefits" catalogue through the role's templates and the person's teams. */

/* ── Reference data ────────────────────────────────────────────────────── */
/* The platform's wallet catalogue, controlled by OpenDhi (FR-WB-01). A company may also create its own wallet
   type when it adds a wallet (product owner, 10 Nov 2026): that type carries the company's entity and is seen
   only in that company. Provider wallet codes come from the enabled card programme's registry (js/onc-enrollment.js); none is needed to plan benefits. */
const WB_WALLET_TYPES=[
  {code:'MEAL',name:'Meal',cls:'Flexi Benefit',owner:'Employee benefit',funding:'Employer',eligible:'Eligible',status:'Active',
    desc:'Meals at eating places. Kept tax-free only when the wallet is locked to restaurant merchants.'},
  {code:'FUEL',name:'Fuel',cls:'Flexi Benefit',owner:'Employee benefit',funding:'Employer',eligible:'Eligible',status:'Active',
    desc:'Fuel at fuel stations.'},
  {code:'GIFT',name:'Gift',cls:'Flexi Benefit',owner:'Employee benefit',funding:'Employer',eligible:'Eligible',status:'Active',
    desc:'Rewards and occasion gifts.'},
  {code:'TEL',name:'Telecom',cls:'Flexi Benefit',owner:'Employee benefit',funding:'Employer',eligible:'Eligible',status:'Active',
    desc:'Mobile, broadband and telephone bills at telecom merchants.'},
  {code:'CORP',name:'Corporate Expense',cls:'Company Expense',owner:'Company',funding:'Employer',eligible:'Not eligible',status:'Active',
    desc:'Company-funded advances and business spend. Not a recurring employee benefit.'},
  {code:'REIMB',name:'Reimbursement',cls:'Reimbursement',owner:'Employee',funding:'Employer',eligible:'Not eligible',status:'Active',
    desc:'Repayment of approved claims. Not a recurring employee benefit.'},
  {code:'PERS',name:'Personal',cls:'Personal',owner:'Employee',funding:'Employee',eligible:'Not eligible',status:'Active',
    desc:'The employee\'s own money. Never part of a benefit policy.'},
  {code:'NCMC',name:'Transit / NCMC',cls:'Transit',owner:'Employee',funding:'Employer or Employee',eligible:'Conditional',status:'Active',
    desc:'Public transport. Benefit use only under the approved programme rules.'}
];
const WB_FREQS=['Monthly','Annual','One-time'];
const WB_SCOPES=['Entity','Department','Designation','Employee'];
const WB_SCOPE_RANK={'Employee':4,'Designation':3,'Department':2,'Entity':1};
const WB_ANNUAL_BASIS=['Financial Year (Apr–Mar)','Calendar Year (Jan–Dec)'];
const WB_FUNDING=['Over and above CTC','Within CTC (salary restructuring)'];
const WB_YEAR_END=['Carry forward','Lapse at year end','Pay out via payroll (taxable)'];
const WB_PROCESSING=['Wallet-Funded','Claim-Based'];
const WB_TAX_BASIS=['Per meal','Per month','Per tax year'];
const WB_TAX_RULE=['Up to (inclusive)','Below (exclusive)'];
const WB_TABS=[
  {id:'wallets',label:'Wallets',k:'w'},{id:'categories',label:'Categories',k:'c'},{id:'policies',label:'Policies',k:'p'},
  {id:'entitlements',label:'Entitlements',k:'e'},{id:'allocations',label:'Allocations',k:'a'},
  {id:'overrides',label:'Overrides',k:'o'},{id:'thresholds',label:'Tax Thresholds',k:'t'}
];
const WB_KIND_NAME={w:'wallet configuration',c:'benefit category',p:'benefit policy',o:'override',t:'tax threshold',a:'allocation batch',e:'entitlement'};

/* ── Who may do what (RBAC "Benefits" codes, js/rbac-templates.js) ────────── */
/* Who acts and what they may do come from RBAC (js/ems-access.js): the
   switched role's templates in RBAC → Templates (Benefits catalogue) and the
   person's workspace teams. Nothing here names a person or lists rights. */
function wbRole(){return typeof currentRole!=='undefined'&&currentRole?currentRole:'Super Admin';}
/* The signed-in person: a name to read, a User ID for the record (js/identity.js). */
function wbActor(){return (typeof idMeName==='function'&&idMeName())||CURRENT_USER;}
function wbActorId(){return typeof idMe==='function'?idMe():'';}
function wbCan(code){return typeof emsCan==='function'&&emsCan(code);}
function wbDeny(what){showToast('Not permitted','error',(typeof emsRoleLabel==='function'?emsRoleLabel():wbRole())+' cannot '+what+'. Access comes from RBAC Templates → Benefits.');return false;}
const WB_VIEW_PERM={w:'benefit.wallet.view',c:'benefit.category.view',p:'benefit.policy.view',e:'benefit.entitlement.view',
  a:'benefit.allocation.view',o:'benefit.override.view',t:'benefit.tax.view'};

/* ── Dates and money ───────────────────────────────────────────────────── */
const WB_MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function wbToday(){return cdISO(new Date());}
/* '15 Jan 2025', '2025-01-15' or '--' -> ISO or ''. */
function wbISO(v){
  const s=String(v||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const m=s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if(!m)return '';
  const mi=WB_MON.findIndex(function(x){return x.toLowerCase()===m[2].toLowerCase();});
  if(mi<0)return '';
  return m[3]+'-'+String(mi+1).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
}
function wbDate(iso){return iso?cdLabel(iso):'—';}
function wbAddDays(iso,n){const d=new Date(iso+'T00:00:00');d.setDate(d.getDate()+n);return cdISO(d);}
function wbRange(from,to){return (from?wbDate(from):'—')+' → '+(to?wbDate(to):'Open-ended');}
function wbPeriodLabel(p){return p?WB_MON[Number(p.slice(5,7))-1]+' '+p.slice(0,4):'—';}
function wbFYOf(p){const y=Number(p.slice(0,4)),m=Number(p.slice(5,7));return m>=4?y:y-1;}
function wbFYLabel(fy){return 'FY '+fy+'-'+String((fy+1)%100).padStart(2,'0');}
function wbFYPeriods(fy){
  const out=[];for(let i=0;i<12;i++){const m=(3+i)%12,y=fy+(3+i>=12?1:0);out.push(y+'-'+String(m+1).padStart(2,'0'));}return out;
}
/* The periods the screens offer: the current financial year and the next. */
function wbPeriods(){const fy=wbFYOf(wbToday().slice(0,7));return wbFYPeriods(fy).concat(wbFYPeriods(fy+1).slice(0,3));}
function wbMoney(n){return (Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:2})+' INR';}
function wbOverlap(aFrom,aTo,bFrom,bTo){return (!bTo||!aFrom||aFrom<=bTo)&&(!aTo||!bFrom||bFrom<=aTo);}
function wbInRange(iso,from,to){return (!from||from<=iso)&&(!to||iso<=to);}

/* ── Entity and the people in it ───────────────────────────────────────── */
/* Records carry the Entity ID; the name is for reading. */
function wbEntity(){return typeof idEntity==='function'?idEntity():'';}
function wbEntityName(){return idEntityName(wbEntity());}
function wbMine(list){const e=wbEntity();return list.filter(function(r){return r.entity===e;});}
/* One employee as the engine sees them: department, designation, joining
   date, live lifecycle status (js/employee-lifecycle.js) and last working date. */
function wbEmpInfo(e){
  let st={status:e.status||'Active',off:null};
  try{if(typeof empState==='function')st=empState(e);}catch(x){}
  let lwd=st.off&&st.off.lwd||'';
  if(!lwd&&st.status==='Inactive'&&typeof empLogs==='function'){
    const ls=empLogs(e)||[];
    const hit=ls.find(function(l){return l.lwd;});
    if(hit)lwd=hit.lwd;
    else{const k=ls.find(function(l){return /inactive/i.test(l.status||'')||l.type==='mark-inactive';});if(k)lwd=wbISO(k.date);}
  }
  return {rec:e,eid:e.eid,empId:e.empId,name:e.name,dept:e.dept||'',desig:e.jobTitle||'',join:wbISO(e.joinDate),status:st.status,lwd:lwd,
    benefits:typeof oncBenefitsEligible==='function'?oncBenefitsEligible(e.eid):true};   // the card enrollment's switch
}
/* The active entity's Direct employees. Records name an employee by Employee
   ID (eid); the Employee Code (empId) is what people read. */
function wbEmployees(){return (typeof directEmpData!=='undefined'?directEmpData:[]).filter(function(e){return e.empId&&e.entityId===wbEntity();}).map(wbEmpInfo);}
function wbEmpById(eid){return eid?wbEmployees().find(function(x){return x.eid===eid;})||null:null;}
function wbDepts(){
  if(typeof csDeptNames==='function')return csDeptNames();
  const s={};wbEmployees().forEach(function(e){if(e.dept)s[e.dept]=1;});return Object.keys(s).sort();
}
function wbDesigs(){
  if(typeof csDesigNames==='function')return csDesigNames();
  const s={};wbEmployees().forEach(function(e){if(e.desig)s[e.desig]=1;});return Object.keys(s).sort();
}
function wbEmpLabel(e){return e.name+' · '+e.empId;}
function wbLabelKey(l){const p=String(l||'').split(' · ');return p.length>1?p[p.length-1]:'';}
/* A picker label (name · code) back to the employee. */
function wbEmpFromLabel(l){return l?wbEmployees().find(function(e){return wbEmpLabel(e)===l;})||null:null;}

/* ── The stores ────────────────────────────────────────────────────────── */
const WB_E=ID_HOME_ENTITY;   // the shipped configuration belongs to the first entity
function wbLog(date,time,user,status,action){return {date:date,time:time,user:user,status:status,action:action,userId:user===wbActor()?wbActorId():''};}

const wbWallets=[
  {id:1,key:'WC-1001',entity:WB_E,type:'MEAL',effFrom:'2026-04-01',effTo:'',desc:'Meal benefit for all Direct employees.',status:'Active',activatedOn:'2026-03-20',createdBy:'Pallavi Parate',createdAt:'18 Mar 2026 | 10:05:00 AM'},
  {id:2,key:'WC-1002',entity:WB_E,type:'FUEL',effFrom:'2026-04-01',effTo:'',desc:'',status:'Active',activatedOn:'2026-03-20',createdBy:'Pallavi Parate',createdAt:'18 Mar 2026 | 10:07:00 AM'},
  {id:3,key:'WC-1003',entity:WB_E,type:'GIFT',effFrom:'2026-04-01',effTo:'',desc:'Festive and occasion gifts.',status:'Active',activatedOn:'2026-03-20',createdBy:'Pallavi Parate',createdAt:'18 Mar 2026 | 10:09:00 AM'},
  {id:4,key:'WC-1004',entity:WB_E,type:'CORP',effFrom:'2026-04-01',effTo:'',desc:'Imprest for travel and client spend.',status:'Active',activatedOn:'2026-03-21',createdBy:'Shaun Mathew',createdAt:'21 Mar 2026 | 03:30:00 PM'},
  {id:5,key:'WC-1005',entity:WB_E,type:'REIMB',effFrom:'2026-04-01',effTo:'',desc:'',status:'Active',activatedOn:'2026-03-21',createdBy:'Shaun Mathew',createdAt:'21 Mar 2026 | 03:32:00 PM'},
  {id:6,key:'WC-1006',entity:WB_E,type:'NCMC',effFrom:'2026-12-01',effTo:'',desc:'Waiting for the card provider\'s transit programme rules before activation.',status:'Draft',createdBy:'Pallavi Parate',createdAt:'02 Nov 2026 | 11:20:00 AM'}
];
const wbCategories=[
  {id:1,key:'BC-MEAL',entity:WB_E,name:'Meal Allowance',code:'MEAL',processing:'Wallet-Funded',walletId:1,expCat:'',effFrom:'2026-04-01',effTo:'',desc:'Meal vouchers on the Meal wallet.',status:'Active',activatedOn:'2026-03-22',createdBy:'Pallavi Parate',createdAt:'22 Mar 2026 | 11:00:00 AM'},
  {id:2,key:'BC-FUEL',entity:WB_E,name:'Fuel Allowance',code:'FUEL',processing:'Wallet-Funded',walletId:2,expCat:'',effFrom:'2026-04-01',effTo:'',desc:'',status:'Active',activatedOn:'2026-03-22',createdBy:'Pallavi Parate',createdAt:'22 Mar 2026 | 11:04:00 AM'},
  {id:3,key:'BC-GIFT',entity:WB_E,name:'Festive Gift',code:'GIFT',processing:'Wallet-Funded',walletId:3,expCat:'',effFrom:'2026-04-01',effTo:'',desc:'Occasion gifts (Diwali, New Year, national days).',status:'Active',activatedOn:'2026-03-22',createdBy:'Pallavi Parate',createdAt:'22 Mar 2026 | 11:06:00 AM'},
  {id:4,key:'BC-TEL',entity:WB_E,name:'Telephone & Internet',code:'TEL',processing:'Claim-Based',walletId:null,expCat:'Telephone & Internet',effFrom:'2026-04-01',effTo:'',desc:'Claimed through Expenses against the monthly bill.',status:'Active',activatedOn:'2026-03-22',createdBy:'Pallavi Parate',createdAt:'22 Mar 2026 | 11:10:00 AM'},
  {id:5,key:'BC-BOOK',entity:WB_E,name:'Books & Learning',code:'BOOK',processing:'Claim-Based',walletId:null,expCat:'Books & Learning',effFrom:'2026-04-01',effTo:'',desc:'Books, courses and certifications.',status:'Active',activatedOn:'2026-03-22',createdBy:'Pallavi Parate',createdAt:'22 Mar 2026 | 11:12:00 AM'},
  {id:6,key:'BC-WELL',entity:WB_E,name:'Wellness',code:'WELL',processing:'Claim-Based',walletId:null,expCat:'',effFrom:'2027-01-01',effTo:'',desc:'Gym and wellness. Waiting for the Finance and tax-adviser category matrix.',status:'Draft',createdBy:'Pallavi Parate',createdAt:'04 Nov 2026 | 05:40:00 PM'}
];
function wbV(v,amount,freq,scope,ref,from,to,extra){
  return Object.assign({v:v,amount:amount,frequency:freq,scope:scope,scopeRef:ref||'',effFrom:from,effTo:to||'',annualBasis:'',occasion:''},extra||{});
}
function wbPol(id,n,name,cat,status,versions,o){
  const p=Object.assign({id:id,key:'BP-'+(2000+n),entity:WB_E,name:name,categoryId:cat,status:status,versions:versions,
    funding:'Within CTC (salary restructuring)',yearEnd:'Carry forward',desc:'',createdBy:'Pallavi Parate',createdAt:'24 Mar 2026 | 10:00:00 AM'},o||{});
  if(status==='Active'&&!p.activatedOn)p.activatedOn=versions[0].effFrom<'2026-11-05'?'2026-03-25':'2026-11-02';
  wbPSync(p);return p;
}
const wbPolicies=[
  wbPol(1,1,'General Meal',1,'Active',[wbV(1,1800,'Monthly','Entity','','2026-04-01','2026-08-31'),wbV(2,2000,'Monthly','Entity','','2026-09-01','',{by:'Pallavi Parate',at:'20 Aug 2026',reason:'Meal costs revised from September.'})],
    {desc:'Every Direct employee\'s base meal entitlement.'}),
  wbPol(2,2,'Engineering Meal',1,'Active',[wbV(1,3000,'Monthly','Department','Engineering','2026-04-01','')]),
  wbPol(3,3,'Leadership meal',1,'Active',[wbV(1,9500,'Monthly','Designation','HR Manager','2026-07-01','')],
    {desc:'Client and candidate lunches folded into the meal benefit for people managers.',createdAt:'24 Jun 2026 | 04:15:00 PM'}),
  wbPol(4,4,'Antar meal (relocation)',1,'Active',[wbV(1,3500,'Monthly','Employee','EMP001','2026-10-01','2027-03-31')],
    {desc:'Relocation support for six months.',createdAt:'28 Sep 2026 | 09:40:00 AM'}),
  wbPol(5,5,'Engineering Fuel',2,'Active',[wbV(1,3000,'Monthly','Department','Engineering','2026-04-01','')],{funding:'Over and above CTC'}),
  wbPol(6,6,'Software Engineer Fuel',2,'Active',[wbV(1,4000,'Monthly','Designation','Software Engineer','2026-04-01','')],{funding:'Over and above CTC'}),
  wbPol(7,7,'Diwali Gift 2026',3,'Active',[wbV(1,5000,'One-time','Entity','','2026-10-01','2026-11-30',{occasion:'2026-11-08'})],
    {funding:'Over and above CTC',yearEnd:'Lapse at year end',createdAt:'20 Sep 2026 | 12:00:00 PM'}),
  wbPol(8,8,'New Year Gift 2027',3,'Active',[wbV(1,3000,'One-time','Entity','','2026-12-01','2027-01-31',{occasion:'2027-01-01'})],
    {funding:'Over and above CTC',yearEnd:'Lapse at year end',createdAt:'30 Oct 2026 | 03:00:00 PM'}),
  wbPol(9,9,'Independence Day Gift',3,'Active',[wbV(1,2000,'One-time','Entity','','2026-08-01','2026-08-31',{occasion:'2026-08-15'})],
    {funding:'Over and above CTC',yearEnd:'Lapse at year end',createdAt:'25 Jul 2026 | 11:00:00 AM'}),
  wbPol(10,10,'Telephone & Internet',4,'Active',[wbV(1,1500,'Monthly','Entity','','2026-04-01','')],{funding:'Over and above CTC',yearEnd:'Lapse at year end'}),
  wbPol(11,11,'Books & Learning',5,'Active',[wbV(1,6000,'Annual','Entity','','2026-04-01','',{annualBasis:'Financial Year (Apr–Mar)'})],{funding:'Over and above CTC',yearEnd:'Lapse at year end'}),
  wbPol(12,12,'Design team fuel',2,'Draft',[wbV(1,2500,'Monthly','Department','Design','2026-12-01','')],{funding:'Over and above CTC',createdAt:'03 Nov 2026 | 02:10:00 PM'}),
  wbPol(13,13,'Engineering Meal (revised)',1,'Draft',[wbV(1,3200,'Monthly','Department','Engineering','2027-01-01','')],
    {desc:'Proposed revision. Activating it while Engineering Meal (BP-2002) is open-ended is a conflict.',createdAt:'04 Nov 2026 | 10:30:00 AM'})
];
const wbOverrides=[
  {id:1,key:'BO-3001',entity:WB_E,empId:'EMP005',categoryId:2,amount:6000,effFrom:'2026-10-01',effTo:'2027-03-31',
    reason:'Field QA visits to client sites, approved by the Engineering head.',status:'Active',activatedOn:'2026-09-29',createdBy:'Pallavi Parate',createdAt:'29 Sep 2026 | 04:00:00 PM'},
  {id:2,key:'BO-3002',entity:WB_E,empId:'EMP002',categoryId:1,amount:8000,effFrom:'2026-12-01',effTo:'',
    reason:'Brought under the advisory tax-free meal reference from December.',status:'Active',activatedOn:'2026-11-04',createdBy:'Pallavi Parate',createdAt:'04 Nov 2026 | 06:10:00 PM'}
];
const wbThresholds=[
  {id:1,key:'TT-4001',entity:WB_E,name:'Meal vouchers - tax-free per meal',walletType:'MEAL',basis:'Per meal',amount:200,meals:2,days:22,rule:'Up to (inclusive)',
    effFrom:'2026-04-01',effTo:'',source:'Income-tax Rules 2026, Rule 15 (from 1 Apr 2026)',note:'Meals at work or vouchers usable only at eating places.',
    status:'Active',activatedOn:'2026-04-02',createdBy:'Pallavi Parate',submittedBy:'Pallavi Parate',approvedBy:'Vikram Rao',createdAt:'01 Apr 2026 | 10:00:00 AM'},
  {id:2,key:'TT-4002',entity:WB_E,name:'Meal vouchers - tax-free per meal (old rule)',walletType:'MEAL',basis:'Per meal',amount:50,meals:2,days:22,rule:'Up to (inclusive)',
    effFrom:'2001-04-01',effTo:'2026-03-31',source:'Income-tax Rules 1962, Rule 3(7)(iii)',note:'Superseded by Rule 15 of the 2026 Rules.',
    status:'Active',activatedOn:'2025-04-01',createdBy:'Pallavi Parate',submittedBy:'Pallavi Parate',approvedBy:'Vikram Rao',createdAt:'01 Apr 2025 | 10:00:00 AM'},
  {id:3,key:'TT-4003',entity:WB_E,name:'Gifts and vouchers - tax-free per tax year',walletType:'GIFT',basis:'Per tax year',amount:15000,meals:0,days:0,rule:'Below (exclusive)',
    effFrom:'2026-04-01',effTo:'',source:'Income-tax Rules 2026 (gifts below 15,000 a tax year)',note:'At or above the limit the whole amount may become taxable.',
    status:'Active',activatedOn:'2026-04-02',createdBy:'Pallavi Parate',submittedBy:'Pallavi Parate',approvedBy:'Vikram Rao',createdAt:'01 Apr 2026 | 10:20:00 AM'},
  {id:4,key:'TT-4004',entity:WB_E,name:'Gifts and vouchers (old rule)',walletType:'GIFT',basis:'Per tax year',amount:5000,meals:0,days:0,rule:'Below (exclusive)',
    effFrom:'2001-04-01',effTo:'2026-03-31',source:'Income-tax Rules 1962',note:'',
    status:'Active',activatedOn:'2025-04-01',createdBy:'Pallavi Parate',submittedBy:'Pallavi Parate',approvedBy:'Vikram Rao',createdAt:'01 Apr 2025 | 10:20:00 AM'},
  {id:5,key:'TT-4005',entity:WB_E,name:'Meal vouchers - 24 working days',walletType:'MEAL',basis:'Per meal',amount:200,meals:2,days:24,rule:'Up to (inclusive)',
    effFrom:'2027-04-01',effTo:'',source:'Income-tax Rules 2026, Rule 15',note:'Six-day week for plant staff from FY 2027-28.',
    status:'Pending Approval',createdBy:'Pallavi Parate',submittedBy:'Pallavi Parate',createdAt:'03 Nov 2026 | 12:30:00 PM'}
];
/* The shipped configuration names people the old way: overrides and
   Employee-scope policy versions by Employee Code, actors by name. Matched
   once to IDs inside the entity (js/identity.js); a code or name that does
   not match exactly one person is left empty and listed for review. */
(function(){
  const who=function(r,k){if(r[k]&&!r[k+'Id'])r[k+'Id']=idUserByName(r[k],r.entity);};
  [wbWallets,wbCategories,wbPolicies,wbOverrides,wbThresholds].forEach(function(list){list.forEach(function(r){
    r.entity=idEntityRef(r.entity)||WB_E;
    ['createdBy','submittedBy','approvedBy','rejectedBy'].forEach(function(k){who(r,k);});
  });});
  wbOverrides.forEach(function(o){
    if(o.eid)return;
    const e=idEmpByCode(o.empId,o.entity);o.eid=e?e.eid:'';
    if(!e)idNote('Benefit override',o.key,o.empId,'No employee with this code in '+idEntityName(o.entity)+'.','',o.entity);
    delete o.empId;
  });
  wbPolicies.forEach(function(p){p.versions.forEach(function(v){
    if(v.by&&!v.byId)v.byId=idUserByName(v.by,p.entity);
    if(v.scope!=='Employee'||!v.scopeRef||idEmp(v.scopeRef))return;
    const e=idEmpByCode(v.scopeRef,p.entity);
    if(!e)idNote('Benefit policy',p.key+' v'+v.v,v.scopeRef,'No employee with this code in '+idEntityName(p.entity)+'.','',p.entity);
    v.scopeRef=e?e.eid:'';
  });});
})();
let wbBatches=[];
let wbNext={w:7,c:7,p:14,o:3,t:6,a:1,al:1};
const WB_STORE={w:function(){return wbWallets;},c:function(){return wbCategories;},p:function(){return wbPolicies;},
  o:function(){return wbOverrides;},t:function(){return wbThresholds;},a:function(){return wbBatches;}};
function wbRec(kind,id){
  if(kind==='e')return wbEntRec(id);
  const L=WB_STORE[kind]?WB_STORE[kind]():[];
  return L.find(function(x){return x.id===id;})||null;
}

/* ── Status: stored vs shown ───────────────────────────────────────────────
   Records store Draft / Active / Inactive (thresholds also Pending Approval /
   Rejected). An Active record whose dates have not started shows Scheduled;
   one whose dates have passed shows Expired. */
function wbPSync(p){p.effFrom=p.versions[0].effFrom;p.effTo=p.versions[p.versions.length-1].effTo;}
function wbShown(kind,r){
  if(kind==='a')return r.status;
  if(r.status!=='Active')return r.status;
  const t=wbToday();
  if(r.effFrom&&t<r.effFrom)return 'Scheduled';
  if(r.effTo&&t>r.effTo)return 'Expired';
  return 'Active';
}
/* In force on a date: activated at some point, and the date inside its range.
   Deactivating end-dates a record rather than erasing it, so history holds. */
function wbInForce(r,iso){
  if(!(r.status==='Active'||r.status==='Inactive')||!r.activatedOn)return false;
  return wbInRange(iso,r.effFrom,r.effTo)&&(!r.effTo||!r.effFrom||r.effFrom<=r.effTo);
}
const WB_MOVES={
  w:{'Draft':['Active','Inactive'],'Active':['Inactive'],'Inactive':['Active']},
  c:{'Draft':['Active','Inactive'],'Active':['Inactive'],'Inactive':['Active']},
  p:{'Draft':['Active','Inactive'],'Active':['Inactive'],'Inactive':['Active']},
  o:{'Active':['Inactive'],'Inactive':['Active']},
  t:{'Draft':['Pending Approval','Inactive'],'Pending Approval':['Active','Rejected','Draft'],'Rejected':['Draft','Inactive'],'Active':['Inactive'],'Inactive':[]},
  a:{'Planned':['Pending Approval','Cancelled'],'Pending Approval':['Approved','Rejected','Planned'],'Rejected':['Planned','Cancelled'],'Approved':[],'Cancelled':[],'Superseded':[]}
};
const WB_MOVE_LABELS={
  w:{'Active':'Activate','Inactive':'Deactivate'},c:{'Active':'Activate','Inactive':'Deactivate'},p:{'Active':'Activate','Inactive':'Deactivate'},
  o:{'Active':'Reactivate','Inactive':'Deactivate'},
  t:{'Pending Approval':'Submit for Finance approval','Active':'Approve','Rejected':'Reject','Draft':'Return to Draft','Inactive':'Deactivate'},
  a:{'Pending Approval':'Submit for approval','Approved':'Approve','Rejected':'Reject','Planned':'Return to Planned','Cancelled':'Cancel batch'}
};
function wbMoves(kind,r){return (WB_MOVES[kind]&&WB_MOVES[kind][r.status])||[];}
function wbBadge(s){return axBadge(statusTone(s),s);}

/* ── Look-ups ──────────────────────────────────────────────────────────── */
/* A company's own wallet types are kept apart from the platform catalogue (they are company data, kept with the company's records). */
const wbCustomTypes=[];
function wbType(code){return WB_WALLET_TYPES.find(function(t){return t.code===code;})||wbCustomTypes.find(function(t){return t.code===code;})||null;}
/* The wallet types this company sees: the platform catalogue and the types it created itself. */
function wbTypesHere(){const e=wbEntity();return WB_WALLET_TYPES.concat(wbCustomTypes).filter(function(t){return !t.entity||t.entity===e;});}
const WB_NEW_TYPE='+ Create new wallet type';
const WB_NEW_CLASSES=['Flexi Benefit','Company Expense'];
/* A new wallet type from the wallet form: '' or why not. */
function wbNewTypeCheck(d){
  const name=String(d.newName||'').trim(),code=String(d.newCode||'').trim().toUpperCase();
  if(name.length<2||name.length>30)return 'Wallet type name: 2 to 30 characters.';
  if(!/^[A-Z][A-Z0-9]{1,7}$/.test(code))return 'Wallet code: 2 to 8 letters or digits, starting with a letter.';
  if(wbType(code))return 'Wallet code '+code+' is already used.';
  if(wbTypesHere().some(function(t){return t.name.toLowerCase()===name.toLowerCase();}))return 'A wallet type named '+name+' already exists.';
  if(WB_NEW_CLASSES.indexOf(d.newCls)<0)return 'Pick the classification.';
  return '';
}
function wbNewTypeCreate(d){
  const s=stampNow(),cls=d.newCls,t={code:String(d.newCode).trim().toUpperCase(),name:String(d.newName).trim(),cls:cls,owner:cls==='Company Expense'?'Company':'Employee benefit',
    funding:'Employer',eligible:cls==='Flexi Benefit'?'Eligible':'Not eligible',status:'Active',desc:String(d.newDesc||'').trim()||'Created by '+wbEntityName()+'.',
    entity:wbEntity(),custom:true,createdBy:wbActor(),createdById:wbActorId(),createdAt:s.date+' | '+s.time};
  wbCustomTypes.push(t);
  return t;
}
function wbTypeName(code){const t=wbType(code);return t?t.name:code;}
function wbWalletOf(cat){return cat&&cat.walletId?wbRec('w',cat.walletId):null;}
function wbCatName(id){const c=wbRec('c',id);return c?c.name:'—';}
function wbCatLabel(c){return c.name+' · '+c.key;}
function wbWalletLabel(w){return wbTypeName(w.type)+' · '+w.key;}
function wbCatByLabel(l){const k=wbLabelKey(l);return wbMine(wbCategories).find(function(c){return c.key===k;})||null;}
function wbWalletByLabel(l){const k=wbLabelKey(l);return wbMine(wbWallets).find(function(w){return w.key===k;})||null;}
function wbCurV(p){
  const t=wbToday();
  return p.versions.find(function(v){return wbInRange(t,v.effFrom,v.effTo);})
    ||p.versions.find(function(v){return v.effFrom>t;})||p.versions[p.versions.length-1];
}
function wbScopeText(v){
  if(v.scope==='Entity')return 'Everyone in '+wbEntityName();
  if(v.scope==='Employee'){const e=wbEmpById(v.scopeRef);return e?e.name+' ('+e.empId+')':v.scopeRef;}
  return v.scopeRef;
}
function wbFreqText(v){
  if(v.frequency==='Annual')return 'Annual · '+(v.annualBasis||WB_ANNUAL_BASIS[0]);
  if(v.frequency==='One-time')return 'One-time · '+wbDate(v.occasion);
  return 'Monthly';
}
function wbAnnualStart(v){return /^Calendar/.test(v.annualBasis||'')?1:4;}

/* ── The engine ────────────────────────────────────────────────────────── */
/* 15th-of-month rule. ref is the date eligibility is tested on: the 15th of
   the month, or the occasion date of a one-time policy. */
function wbElig(emp,ref,oneTime){
  const at=oneTime?'the occasion date ('+wbDate(ref)+')':'the 15th ('+wbDate(ref)+')';
  if(emp.benefits===false)return {ok:false,why:'Excluded from benefits'};
  if(!emp.join)return {ok:false,why:'No joining date on record'};
  if(emp.join>ref)return {ok:false,why:'Joined '+wbDate(emp.join)+', after '+at+(oneTime?'':' - eligible from next month')};
  if(emp.lwd&&emp.lwd<=ref)return {ok:false,why:'Last working date '+wbDate(emp.lwd)+' is on or before '+at};
  if(emp.status==='Pending'||emp.status==='Onboarding')return {ok:false,why:'Status is '+emp.status+' - benefits start once Active'};
  if(emp.status==='Inactive'&&!emp.lwd)return {ok:false,why:'Inactive'};
  return {ok:true,why:'Active on '+at};
}
function wbCatInForce(c,iso){
  if(!wbInForce(c,iso))return false;
  if(c.processing==='Wallet-Funded'){const w=wbWalletOf(c);if(!w||!wbInForce(w,iso))return false;}
  return true;
}
function wbScopeHit(v,emp){
  if(v.scope==='Entity')return true;
  if(v.scope==='Department')return emp.dept===v.scopeRef;
  if(v.scope==='Designation')return emp.desig===v.scopeRef;
  if(v.scope==='Employee')return emp.eid===v.scopeRef;
  return false;
}
/* The version of a policy that counts for a period, and the date it is tested on. */
function wbPolicyForPeriod(p,period){
  if(!(p.status==='Active'||p.status==='Inactive')||!p.activatedOn)return null;
  for(let i=0;i<p.versions.length;i++){
    const v=p.versions[i];
    if(v.frequency==='One-time'&&v.occasion&&v.occasion.slice(0,7)===period&&wbInRange(v.occasion,v.effFrom,v.effTo)&&(!v.effTo||v.effFrom<=v.effTo))
      return {v:v,ref:v.occasion};
  }
  const ref=period+'-15';
  const v=p.versions.find(function(x){return x.frequency!=='One-time'&&wbInRange(ref,x.effFrom,x.effTo)&&(!x.effTo||x.effFrom<=x.effTo);});
  return v?{v:v,ref:ref}:null;
}
/* Everything the engine knows about one person, one category, one period. */
function wbResolve(emp,cat,period){
  const cands=[];
  wbMine(wbPolicies).forEach(function(p){
    if(p.categoryId!==cat.id)return;
    const hit=wbPolicyForPeriod(p,period);
    if(!hit||!wbScopeHit(hit.v,emp))return;
    cands.push({p:p,v:hit.v,ref:hit.ref,rank:WB_SCOPE_RANK[hit.v.scope]});
  });
  cands.sort(function(a,b){return b.rank-a.rank;});
  const top=cands.length?cands.filter(function(c){return c.rank===cands[0].rank;}):[];
  const base=top[0]||null;
  const ref=base?base.ref:period+'-15';
  if(!wbCatInForce(cat,ref))return null;
  const ovs=wbMine(wbOverrides).filter(function(o){return o.eid===emp.eid&&o.categoryId===cat.id&&wbInForce(o,ref);});
  if(!cands.length&&!ovs.length)return null;
  const v=base?base.v:null;
  const r={id:emp.eid+'_'+cat.id+'_'+period,emp:emp,cat:cat,wallet:wbWalletOf(cat),period:period,ref:ref,
    freq:v?v.frequency:'Monthly',annualBasis:v?v.annualBasis:'',occasion:v?v.occasion:'',cands:cands,conflict:null,amount:0,source:null};
  if(ovs.length){r.source={type:'Override',rec:ovs[0],v:v};r.amount=Number(ovs[0].amount)||0;}
  else if(top.length>1){r.conflict=top.map(function(c){return c.p;});}
  else{r.source={type:'Policy',rec:base.p,v:base.v};r.amount=Number(base.v.amount)||0;}
  if(r.freq==='Annual'){
    const sm=wbAnnualStart(v);
    r.due=Number(period.slice(5,7))===sm;
    r.dueNote=r.due?'':'Annual · allocated in '+WB_MON[sm-1];
  }else{r.due=true;r.dueNote='';}
  r.elig=wbElig(emp,ref,r.freq==='One-time');
  r.state=r.conflict?'Conflict':(r.elig.ok?'Eligible':'Not Eligible');
  return r;
}
function wbEntitlements(period){
  const cats=wbMine(wbCategories);const out=[];
  wbEmployees().forEach(function(emp){cats.forEach(function(c){const r=wbResolve(emp,c,period);if(r)out.push(r);});});
  return out;
}
/* What would actually be allocated for this row this period. */
function wbAllocatable(r){return r.due&&!r.conflict&&r.elig.ok&&r.amount>0;}
function wbFYTotal(emp,walletType,fy){
  let sum=0;
  wbFYPeriods(fy).forEach(function(p){
    wbMine(wbCategories).forEach(function(c){
      const w=wbWalletOf(c);if(!w||w.type!==walletType)return;
      const r=wbResolve(emp,c,p);if(r&&wbAllocatable(r))sum+=r.amount;
    });
  });
  return sum;
}
/* Cost projection: what a period and its financial year come to, by wallet
   and by category. Planned figures - never balances. */
function wbOwnOnly(){return typeof emsOwnEntitlementsOnly==='function'&&emsOwnEntitlementsOnly();}
/* An employee's projection counts only their own rows, for the period shown. */
function wbProjectionOf(rows,period){
  const fy=wbFYOf(period);const now={total:0,count:0,byWallet:{},byCat:{}},year={total:0,count:0,byWallet:{},byCat:{}};
  const add=function(acc,r){acc.total+=r.amount;acc.count++;const wk=r.wallet?wbTypeName(r.wallet.type):'Claim-Based';acc.byWallet[wk]=(acc.byWallet[wk]||0)+r.amount;acc.byCat[r.cat.name]=(acc.byCat[r.cat.name]||0)+r.amount;};
  rows.forEach(function(r){if(wbAllocatable(r))add(now,r);});
  wbFYPeriods(fy).forEach(function(p){wbScopeEnt(wbEntitlements(p)).forEach(function(r){if(wbAllocatable(r))add(year,r);});});
  return {now:now,year:year,fy:fy};
}
function wbProjection(period){
  const fy=wbFYOf(period);
  const now={total:0,count:0,byWallet:{},byCat:{}},year={total:0,count:0,byWallet:{},byCat:{}};
  const add=function(acc,r){
    acc.total+=r.amount;acc.count++;
    const wk=r.wallet?wbTypeName(r.wallet.type):'Claim-Based';
    acc.byWallet[wk]=(acc.byWallet[wk]||0)+r.amount;
    acc.byCat[r.cat.name]=(acc.byCat[r.cat.name]||0)+r.amount;
  };
  wbFYPeriods(fy).forEach(function(p){
    wbEntitlements(p).forEach(function(r){if(!wbAllocatable(r))return;add(year,r);if(p===period)add(now,r);});
  });
  if(wbFYPeriods(fy).indexOf(period)<0)wbEntitlements(period).forEach(function(r){if(wbAllocatable(r))add(now,r);});
  return {now:now,year:year,fy:fy};
}

/* ── Tax thresholds (advisory) ─────────────────────────────────────────── */
function wbThRef(t){
  if(t.basis==='Per meal')return {per:'month',amt:(Number(t.amount)||0)*(Number(t.meals)||0)*(Number(t.days)||0)};
  if(t.basis==='Per month')return {per:'month',amt:Number(t.amount)||0};
  return {per:'year',amt:Number(t.amount)||0};
}
function wbThRuleText(t){
  if(t.basis==='Per meal')return wbMoney(t.amount)+' per meal × '+t.meals+' meals × '+t.days+' days = '+wbMoney(wbThRef(t).amt)+' a month';
  if(t.basis==='Per month')return (/^Below/.test(t.rule)?'Below ':'Up to ')+wbMoney(t.amount)+' a month';
  return (/^Below/.test(t.rule)?'Below ':'Up to ')+wbMoney(t.amount)+' a tax year';
}
function wbThresholdsAt(type,iso){
  return wbMine(wbThresholds).filter(function(t){return t.walletType===type&&t.status==='Active'&&wbInRange(iso,t.effFrom,t.effTo);});
}
function wbOver(t,val,ref){return /^Below/.test(t.rule)?val>=ref:val>ref;}
/* Flags for one entitlement (a person's resolved amount). */
function wbTaxFlags(r){
  if(!r||!r.wallet||!wbAllocatable(r))return [];
  const out=[];
  wbThresholdsAt(r.wallet.type,r.ref).forEach(function(t){
    const R=wbThRef(t);
    if(R.per==='month'){
      const m=r.freq==='Annual'?r.amount/12:(r.freq==='One-time'?0:r.amount);
      if(m&&wbOver(t,m,R.amt))out.push({t:t,text:wbMoney(m)+' a month is above the advisory tax-free reference of '+wbMoney(R.amt)+' ('+t.key+'). The excess may be a taxable perquisite.'});
    }else{
      const fy=wbFYOf(r.period),tot=wbFYTotal(r.emp,r.wallet.type,fy);
      if(wbOver(t,tot,R.amt))out.push({t:t,text:wbFYLabel(fy)+' '+wbTypeName(r.wallet.type)+' total of '+wbMoney(tot)+' is '+(/^Below/.test(t.rule)?'at or above ':'above ')+wbMoney(R.amt)+' ('+t.key+'). '+(/^Below/.test(t.rule)?'The whole amount may become taxable.':'The excess may be taxable.')});
    }
  });
  return out;
}
/* Flags for a policy on its own (form and panel): what one person gets from it. */
function wbPolicyTaxFlags(catId,v){
  const c=wbRec('c',catId);const w=wbWalletOf(c);
  if(!w||!v||!(Number(v.amount)>0))return [];
  const at=v.frequency==='One-time'&&v.occasion?v.occasion:(v.effFrom||wbToday());
  const out=[];
  wbThresholdsAt(w.type,at).forEach(function(t){
    const R=wbThRef(t),a=Number(v.amount);
    if(R.per==='month'){
      const m=v.frequency==='Annual'?a/12:(v.frequency==='One-time'?0:a);
      if(m&&wbOver(t,m,R.amt))out.push('Above the advisory tax-free reference of '+wbMoney(R.amt)+' a month ('+t.key+': '+wbThRuleText(t)+'). The excess may be a taxable perquisite.');
    }else{
      const y=v.frequency==='Monthly'?a*12:a;
      if(wbOver(t,y,R.amt))out.push('This policy alone comes to '+wbMoney(y)+' a year, '+(/^Below/.test(t.rule)?'at or above ':'above ')+wbMoney(R.amt)+' ('+t.key+'). The whole gift amount may become taxable.');
    }
  });
  return out;
}
function wbAdvisoryHTML(lines){
  if(!lines||!lines.length)return '';
  return '<div class="wb-note is-wait"><b>Tax advisory</b> · '+lines.map(sbEsc).join('<br>')+'<div class="wb-note-sub">Advisory only, from Finance-approved thresholds. Nothing is blocked.</div></div>';
}

/* ── Allocation batches ────────────────────────────────────────────────── */
const WB_LIVE_BATCH=['Planned','Pending Approval','Approved'];
function wbBatchTotal(b){return b.rows.filter(function(x){return x.status==='Planned';}).reduce(function(s,x){return s+x.amount;},0);}
function wbBatchLive(b){return b.rows.filter(function(x){return x.status==='Planned';});}
/* The live allocation for one person, category and period, if any. */
function wbAllocFor(eid,catId,period,except){
  const skip=[].concat(except==null?[]:except);
  let hit=null;
  wbMine(wbBatches).forEach(function(b){
    if(b.period!==period||skip.indexOf(b.id)>=0||WB_LIVE_BATCH.indexOf(b.status)<0)return;
    const row=b.rows.find(function(x){return x.eid===eid&&x.categoryId===catId&&x.status==='Planned';});
    if(row&&(!hit||b.id>hit.batch.id))hit={batch:b,row:row};
  });
  return hit;
}
function wbAllocStatus(r){const a=wbAllocFor(r.emp.eid,r.cat.id,r.period);return a?a.batch.status:'Not Generated';}
/* What generation would create for a period, and why everyone else is left out. */
function wbBuild(period,except){
  const rows=[],exc=[];
  wbEntitlements(period).forEach(function(r){
    if(!r.due)return;
    if(r.conflict){exc.push({r:r,why:'Conflict between '+r.conflict.map(function(p){return p.key;}).join(' and ')});return;}
    if(!r.elig.ok){exc.push({r:r,why:r.elig.why});return;}
    if(!(r.amount>0))return;
    const ex=wbAllocFor(r.emp.eid,r.cat.id,period,except);
    if(ex){exc.push({r:r,why:'Already allocated in '+ex.batch.key+' ('+ex.batch.status+')'});return;}
    rows.push(r);
  });
  return {rows:rows,exc:exc};
}
function wbAllocRow(b,r,prev){
  const n=wbNext.al++;
  return {id:n,key:'AL-'+(5000+n),batchId:b.id,entity:b.entity,eid:r.emp.eid,empId:r.emp.empId,empName:r.emp.name,categoryId:r.cat.id,categoryName:r.cat.name,
    walletId:r.wallet?r.wallet.id:null,walletType:r.wallet?r.wallet.type:'',period:b.period,frequency:r.freq,
    sourceType:r.source.type,sourceId:r.source.rec.id,sourceKey:r.source.rec.key,policyVersion:r.source.v?r.source.v.v:null,
    overrideRef:r.source.type==='Override'?r.source.rec.key:'',amount:r.amount,currency:'INR',status:'Planned',
    prevAmount:prev?prev.amount:null,prevKey:prev?prev.key:'',generatedBy:b.generatedBy,generatedOn:b.generatedAt,cancelReason:''};
}
function wbMakeBatch(period,built,o){
  o=o||{};
  const s=o.stamp||stampNow();
  const n=wbNext.a++;
  const b={id:n,key:'AB-'+(1000+n),entity:wbEntity(),period:period,status:'Planned',generatedBy:o.by||wbActor(),generatedById:o.byId||wbActorId(),generatedRole:o.role||(typeof emsRoleLabel==='function'?emsRoleLabel():wbRole()),
    generatedAt:s.date+' | '+s.time,submittedBy:'',approvedBy:'',approvedAt:'',replaces:o.replaces||null,replacedBy:null,rows:[],exceptions:[],logs:[],recalcs:[]};
  b.rows=built.rows.map(function(r){return wbAllocRow(b,r);});
  b.exceptions=built.exc.map(function(e){return {empId:e.r.emp.empId,name:e.r.emp.name,cat:e.r.cat.name,why:e.why};});
  b.logs=[wbLog(s.date,s.time,b.generatedBy,'Planned','Generated '+b.rows.length+' allocations ('+wbMoney(wbBatchTotal(b))+') for '+wbPeriodLabel(period)
    +(b.exceptions.length?'; '+b.exceptions.length+' left out (see Exceptions)':'')+(o.replaces?'. Replaces '+wbRec('a',o.replaces).key+'. Reason: '+o.reason:'')+'.')];
  wbBatches.unshift(b);
  return b;
}
/* Exit and change flags: a planned row whose person is no longer eligible. */
function wbRowFlag(row){
  if(row.status!=='Planned')return '';
  const emp=wbEmpById(row.eid);
  if(!emp)return 'Employee no longer on the Direct list';
  const c=wbRec('c',row.categoryId);if(!c)return '';
  const r=wbResolve(emp,c,row.period);
  if(!r)return 'No policy applies any more';
  if(!r.elig.ok)return r.elig.why;
  return '';
}
function wbBatchFlags(b){return wbBatchLive(b).map(function(x){return {row:x,why:wbRowFlag(x)};}).filter(function(f){return f.why;});}

/* ── Page state ────────────────────────────────────────────────────────── */
let wbTab='wallets';
const wbSel={w:null,c:null,p:null,o:null,t:null,a:null,e:null};
const wbPTab={w:'basic-details',c:'basic-details',p:'basic-details',o:'basic-details',t:'basic-details',a:'basic-details',e:'basic-details'};
const wbF={w:{q:'',st:'',x:''},c:{q:'',st:'',x:''},p:{q:'',st:'',x:'',y:''},o:{q:'',st:'',x:''},t:{q:'',st:'',x:''},a:{q:'',st:'',x:''},
  e:{q:'',st:'',x:'',y:'',z:''}};
let wbPeriod='';
let wbEdit=null;   // {kind,id,draft,orig}
let wbModal=null;  // {kind,draft}  kind: w c p o t (add) | pv (new version) | g (generate) | rs (reason)
function wbKindOfTab(t){const x=WB_TABS.find(function(y){return y.id===t;});return x?x.k:'w';}
function wbCurPeriod(){
  if(wbPeriod&&wbPeriods().indexOf(wbPeriod)>=0)return wbPeriod;
  const t=wbToday().slice(0,7);return wbPeriods().indexOf(t)>=0?t:wbPeriods()[0];
}

/* ── Panels: open, close, switch tab ──────────────────────────────────── */
function wbDropEdit(){wbEdit=null;}
function wbOpen(kind,id,tab){
  const pre='wb'+kind;
  if(wbSel[kind]!=null&&wbSel[kind]!==id&&sbLeaveGuard(pre,function(){wbOpen(kind,id,tab);}))return;
  if(wbSel[kind]!==id)wbDropEdit();
  wbPTab[kind]=tab||sbKeepTab(wbSel[kind],wbPTab[kind]);wbSel[kind]=id;
  const sb=document.getElementById(pre+'-split-sb');
  if(!sb){renderADTPage();return;}
  sb.classList.add('open');
  isbTab(pre,function(){return wbRenderPanel(kind);});
  document.querySelectorAll('.'+pre+'-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id===pre+'-row-'+id);});
}
function wbClose(kind){
  const pre='wb'+kind;
  if(sbLeaveGuard(pre,function(){wbClose(kind);}))return;
  wbDropEdit();wbSel[kind]=null;
  const sb=document.getElementById(pre+'-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.'+pre+'-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function wbNav(kind,t){if(wbEdit&&!sbHasDraft('wb'+kind))wbDropEdit();wbPTab[kind]=t;isbTab('wb'+kind,function(){return wbRenderPanel(kind);});}
function wbSetTab(t){
  if(wbTab===t)return;
  if(wbEdit&&sbLeaveGuard('wb'+wbEdit.kind,function(){wbSetTab(t);}))return;
  wbDropEdit();wbModal=null;wbTab=t;renderADTPage();
}

/* ── Page ──────────────────────────────────────────────────────────────── */
const WB_ICO={
  wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.5"/></svg>',
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/></svg>',
  policy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  person:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  batch:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  scale:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M5 7h14"/><path d="M5 7l-3 7a4 4 0 0 0 6 0z"/><path d="M19 7l-3 7a4 4 0 0 0 6 0z"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7.58 7-12a7 7 0 1 0-14 0c0 4.42 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>'
};
function buildWalletBenefitsHTML(){
  /* Only the tabs this role may view; an employee gets Entitlements alone. */
  const allowed=WB_TABS.filter(function(t){return wbCan(WB_VIEW_PERM[t.k]);});
  if(allowed.length&&!allowed.some(function(t){return t.id===wbTab;}))wbTab=allowed[0].id;
  const tabs=allowed.map(function(t){return {id:t.id,label:t.label};});
  const k=wbKindOfTab(wbTab);
  let body;
  if(!wbCan(WB_VIEW_PERM[k]))body=wbNoAccessHTML();
  else if(k==='w')body=wbListWallets();
  else if(k==='c')body=wbListCategories();
  else if(k==='p')body=wbListPolicies();
  else if(k==='e')body=wbListEntitlements();
  else if(k==='a')body=wbListBatches();
  else if(k==='o')body=wbListOverrides();
  else body=wbListThresholds();
  return '<div class="mod-page">'+buildModuleTabsHTML(tabs,wbTab,'wbSetTab',true)+body+'</div>'+(wbModal?wbModalHTML():'');
}
function wbNoAccessHTML(){
  return '<div class="lp-page"><div class="wb-empty"><b>No access for '+sbEsc(wbRole())+'</b>'
    +'<span>Wallet & Benefits needs a Benefits permission. It is granted through RBAC Templates → Benefits.</span></div></div>';
}
function wbContextHTML(extra){
  return '<div class="wb-context">'+WB_ICO.pin+'<span><b>'+sbEsc(wbEntityName())+'</b> · Direct (India) employees · '
    +'Planned figures are not wallet balances'+(extra?' · '+extra:'')+'</span>'
    +'<span class="wb-context-who">Signed in as '+sbEsc(wbActor())+' ('+sbEsc(typeof emsRoleLabel==='function'?emsRoleLabel():wbRole())+')</span></div>';
}
function wbStat(kind,s,n){
  return '<div class="listing-stat'+(wbF[kind].st===s?' stat-selected':'')+'" onclick="wbToggleStat(\''+kind+'\',\''+s+'\')">'
    +'<div class="listing-stat-count" style="color:var(--st-'+statusTone(s)+'-fg)">'+n+'</div><div class="listing-stat-label">'+s+'</div></div>';
}
function wbToggleStat(kind,s){wbF[kind].st=wbF[kind].st===s?'':s;wbSel[kind]=null;wbDropEdit();renderADTPage();}
function wbApplyFilters(kind){
  const pick=function(id,all){const v=getCSValue(id);return v&&v!==all?v:'';};
  const f=wbF[kind];
  f.q=lpSearchValue('wb'+kind+'-f-q');
  if(document.getElementById('csw-wb'+kind+'-f-x'))f.x=pick('wb'+kind+'-f-x','__all');
  if(document.getElementById('csw-wb'+kind+'-f-y'))f.y=pick('wb'+kind+'-f-y','__all');
  if(document.getElementById('csw-wb'+kind+'-f-z'))f.z=pick('wb'+kind+'-f-z','__all');
  wbSel[kind]=null;wbDropEdit();renderADTPage();
}
function wbResetFilters(kind){const f=wbF[kind];Object.keys(f).forEach(function(x){f[x]='';});wbSel[kind]=null;wbDropEdit();renderADTPage();}
function wbFilterBar(kind,ph,selects){
  const f=wbF[kind];
  return lpSearchField('wb'+kind+'-f-q',f.q,ph,'wbApplyFilters(\''+kind+'\')')
    +(selects||[]).map(function(s){return apCS('wb'+kind+'-f-'+s.k,s.opts,f[s.k],s.ph);}).join('')
    +clearFiltersBtn([f.q,f.st,f.x,f.y||'',f.z||''],'wbResetFilters(\''+kind+'\')')
    +'<button class="lp-pill-search" onclick="wbApplyFilters(\''+kind+'\')">Search</button>';
}
function wbListShell(kind,o){
  const pre='wb'+kind,f=wbF[kind];
  const pgn=listPage('wb-'+kind,[f.q,f.st,f.x,f.y||'',f.z||'',o.sig||''].join('|'),o.rows,
    '<tr><td colspan="'+o.cols+'" style="padding:24px;text-align:center;color:var(--gray)">'+o.empty+'</td></tr>');
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +wbContextHTML(o.context)
    +(o.top||'')
    +'<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'+o.filters+'</div></div>'
    +(o.tiles?'<div class="listing-stats">'+o.tiles+'</div>':'')+'</div>'
    +(o.actions?'<div class="wb-actions">'+o.actions+'</div>':'')
    +'<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="'+pre+'-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table ax-table wb-table"><thead><tr>'+o.head+'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'+pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(wbSel[kind]!=null?' open':'')+'" id="'+pre+'-split-sb"><div class="lp-isb" id="'+pre+'-isb-inner">'
      +(wbSel[kind]!=null?sbRender(function(){return wbRenderPanel(kind);},pre):'')+'</div></div>'
    +'</div></div>';
}
function wbRowOpen(kind,id){
  const pre='wb'+kind;
  const jid=typeof id==='number'?id:'\''+id+'\'';
  return '<tr class="'+pre+'-row'+(wbSel[kind]===id?' lp-row-selected':'')+'" id="'+pre+'-row-'+id+'" style="cursor:pointer" onclick="wbOpen(\''+kind+'\','+jid+')">';
}
function wbMatchQ(r,q){return !q||lpSearchRows([r],q).length>0;}

/* ── Wallets ──────────────────────────────────────────────────────────── */
function wbListWallets(){
  const f=wbF.w,all=wbMine(wbWallets);
  const shown=all.filter(function(r){
    const t=wbType(r.type)||{};
    if(f.st&&wbShown('w',r)!==f.st)return false;
    if(f.x&&t.name!==f.x)return false;
    return wbMatchQ({key:r.key,type:t.name,cls:t.cls,desc:r.desc},f.q);
  });
  if(wbSel.w!=null&&!shown.some(function(r){return r.id===wbSel.w;}))wbSel.w=null;
  const count=function(s){return all.filter(function(r){return wbShown('w',r)===s;}).length;};
  return wbListShell('w',{cols:8,empty:'No wallet configurations match this filter.',
    filters:wbFilterBar('w','Search wallets',[{k:'x',opts:wbTypesHere().map(function(t){return t.name;}),ph:'All Wallet Types'}]),
    tiles:['Active','Scheduled','Draft','Inactive'].map(function(s){return wbStat('w',s,count(s));}).join(''),
    head:'<th>S. No</th><th>Wallet</th><th>Classification</th><th>Funding Source</th><th>Effective From</th><th>Effective To</th><th>Status</th><th>Action</th>',
    rows:shown.map(function(r,i){
      const t=wbType(r.type)||{};
      return wbRowOpen('w',r.id)
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-main ax-c-link">'+sbEsc(t.name)+'</div><div class="lp-c-sub">'+r.key+'</div></td>'
        +'<td><div class="lp-c-plain">'+sbEsc(t.cls)+'</div><div class="lp-c-sub">Policy: '+sbEsc(t.eligible)+'</div></td>'
        +'<td><div class="lp-c-plain">'+sbEsc(t.funding)+'</div></td>'
        +'<td><div class="lp-c-plain">'+wbDate(r.effFrom)+'</div></td>'
        +'<td><div class="lp-c-plain">'+(r.effTo?wbDate(r.effTo):'Open-ended')+'</div></td>'
        +'<td>'+wbBadge(wbShown('w',r))+'</td>'
        +'<td onclick="event.stopPropagation()">'+rowLogCell('wb-w',r.id)+'</td></tr>';
    })});
}

/* ── Categories ───────────────────────────────────────────────────────── */
function wbListCategories(){
  const f=wbF.c,all=wbMine(wbCategories);
  const shown=all.filter(function(r){
    if(f.st&&wbShown('c',r)!==f.st)return false;
    if(f.x&&r.processing!==f.x)return false;
    return wbMatchQ({key:r.key,name:r.name,code:r.code,desc:r.desc,exp:r.expCat},f.q);
  });
  if(wbSel.c!=null&&!shown.some(function(r){return r.id===wbSel.c;}))wbSel.c=null;
  const count=function(s){return all.filter(function(r){return wbShown('c',r)===s;}).length;};
  return wbListShell('c',{cols:7,empty:'No benefit categories match this filter.',
    filters:wbFilterBar('c','Search categories',[{k:'x',opts:WB_PROCESSING,ph:'All Processing Types'}]),
    tiles:['Active','Scheduled','Draft','Inactive'].map(function(s){return wbStat('c',s,count(s));}).join(''),
    head:'<th>S. No</th><th>Benefit Category</th><th>Processing</th><th>Linked Wallet</th><th>Effective</th><th>Status</th><th>Action</th>',
    rows:shown.map(function(r,i){
      const w=wbWalletOf(r);
      return wbRowOpen('c',r.id)
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-main ax-c-link">'+sbEsc(r.name)+'</div><div class="lp-c-sub">'+r.key+'</div></td>'
        +'<td><div class="lp-c-plain">'+r.processing+'</div></td>'
        +'<td><div class="lp-c-plain">'+(w?sbEsc(wbWalletLabel(w)):(r.expCat?'Expense: '+sbEsc(r.expCat):'—'))+'</div></td>'
        +'<td><div class="lp-c-plain">'+wbRange(r.effFrom,r.effTo)+'</div></td>'
        +'<td>'+wbBadge(wbShown('c',r))+'</td>'
        +'<td onclick="event.stopPropagation()">'+rowLogCell('wb-c',r.id)+'</td></tr>';
    })});
}

/* ── Policies ─────────────────────────────────────────────────────────── */
function wbListPolicies(){
  const f=wbF.p,all=wbMine(wbPolicies);
  const shown=all.filter(function(r){
    const v=wbCurV(r);
    if(f.st&&wbShown('p',r)!==f.st)return false;
    if(f.x&&wbCatName(r.categoryId)!==f.x)return false;
    if(f.y&&v.scope!==f.y)return false;
    return wbMatchQ({key:r.key,name:r.name,cat:wbCatName(r.categoryId),scope:wbScopeText(v),desc:r.desc},f.q);
  });
  if(wbSel.p!=null&&!shown.some(function(r){return r.id===wbSel.p;}))wbSel.p=null;
  const count=function(s){return all.filter(function(r){return wbShown('p',r)===s;}).length;};
  return wbListShell('p',{cols:8,empty:'No benefit policies match this filter.',
    filters:wbFilterBar('p','Search policies',[
      {k:'x',opts:wbMine(wbCategories).map(function(c){return c.name;}),ph:'All Categories'},
      {k:'y',opts:WB_SCOPES,ph:'All Levels'}]),
    tiles:['Active','Scheduled','Draft','Inactive','Expired'].map(function(s){return wbStat('p',s,count(s));}).join(''),
    head:'<th>S. No</th><th>Policy</th><th>Category</th><th>Applies To</th><th>Entitlement</th><th>Effective</th><th>Status</th><th>Action</th>',
    rows:shown.map(function(r,i){
      const v=wbCurV(r),c=wbRec('c',r.categoryId),w=wbWalletOf(c);
      return wbRowOpen('p',r.id)
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(r.name)+'">'+sbEsc(r.name)+'</div><div class="lp-c-sub">'+r.key+' · v'+v.v+'</div></td>'
        +'<td><div class="lp-c-plain">'+sbEsc(c?c.name:'—')+'</div><div class="lp-c-sub">'+(w?sbEsc(wbTypeName(w.type))+' wallet':'Claim-Based')+'</div></td>'
        +'<td><div class="lp-c-plain">'+v.scope+'</div><div class="lp-c-sub ax-c-trunc">'+sbEsc(wbScopeText(v))+'</div></td>'
        +'<td><div class="lp-c-plain">'+wbMoney(v.amount)+'</div><div class="lp-c-sub">'+sbEsc(wbFreqText(v))+'</div></td>'
        +'<td><div class="lp-c-plain">'+wbRange(r.effFrom,r.effTo)+'</div></td>'
        +'<td>'+wbBadge(wbShown('p',r))+'</td>'
        +'<td onclick="event.stopPropagation()">'+rowLogCell('wb-p',r.id)+'</td></tr>';
    })});
}

/* ── Entitlements ─────────────────────────────────────────────────────── */
function wbPeriodHook(v){
  const p=wbPeriods().find(function(x){return wbPeriodLabel(x)===v;});
  if(p){wbPeriod=p;wbSel.e=null;renderADTPage();}
}
function wbEntRows(period){
  const f=wbF.e;
  return wbScopeEnt(wbEntitlements(period)).filter(function(r){
    if(f.st&&f.st!=='Tax Advisory'&&r.state!==f.st)return false;
    if(f.st==='Tax Advisory'&&!wbTaxFlags(r).length)return false;
    if(f.x&&r.emp.dept!==f.x)return false;
    if(f.y&&r.emp.desig!==f.y)return false;
    if(f.z&&r.cat.name!==f.z)return false;
    return wbMatchQ({name:r.emp.name,id:r.emp.empId,cat:r.cat.name},f.q);
  });
}
/* Own rows only for an employee (js/ems-access.js); everything for admins. */
function wbScopeEnt(list){return typeof emsScopeEntitlements==='function'?list.filter(emsScopeEntitlements):list;}
function wbEntRec(id){
  const p=String(id).split('_');if(p.length<3)return null;
  const emp=wbEmpById(p[0]),c=wbRec('c',Number(p[1]));
  return emp&&c?wbResolve(emp,c,p[2]):null;
}
function wbSourceText(r){
  if(r.conflict)return 'Conflict: '+r.conflict.map(function(p){return p.key;}).join(', ');
  if(!r.source)return '—';
  if(r.source.type==='Override')return 'Override '+r.source.rec.key;
  return r.source.rec.key+' · '+r.source.v.scope+' v'+r.source.v.v;
}
function wbProjectionHTML(pr,period){
  const tbl=function(map,title){
    const keys=Object.keys(map);
    if(!keys.length)return '';
    return '<div class="wb-proj-tbl"><div class="wb-proj-h">'+title+'</div><div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><tbody>'
      +keys.map(function(k){return '<tr><td class="csag-td">'+sbEsc(k)+'</td><td class="csag-td wb-num">'+wbMoney(map[k])+'</td></tr>';}).join('')
      +'</tbody></table></div></div>';
  };
  return '<div class="wb-proj">'
    +'<div class="wb-proj-cards">'
      +'<div class="wb-proj-card"><span>Due in '+wbPeriodLabel(period)+'</span><b>'+wbMoney(pr.now.total)+'</b><em>'+pr.now.count+' allocations</em></div>'
      +'<div class="wb-proj-card"><span>'+wbFYLabel(pr.fy)+' projection</span><b>'+wbMoney(pr.year.total)+'</b><em>'+pr.year.count+' allocations across the year</em></div>'
    +'</div>'
    +tbl(pr.now.byWallet,'This period by wallet')+tbl(pr.now.byCat,'This period by category')
    +tbl(pr.year.byWallet,wbFYLabel(pr.fy)+' by wallet')
    +'</div>';
}
function wbListEntitlements(){
  const period=wbCurPeriod(),f=wbF.e;
  const all=wbScopeEnt(wbEntitlements(period)),shown=wbEntRows(period);
  if(wbSel.e!=null&&!shown.some(function(r){return r.id===wbSel.e;}))wbSel.e=null;
  const count=function(s){return s==='Tax Advisory'?all.filter(function(r){return wbTaxFlags(r).length;}).length:all.filter(function(r){return r.state===s;}).length;};
  const pr=wbOwnOnly()?wbProjectionOf(all,period):wbProjection(period);
  const periodPick='<div class="wb-period"><span>Period</span>'+apCS('wbe-f-period',wbPeriods().map(wbPeriodLabel),wbPeriodLabel(period),'Select Period','wbPeriodHook')+'</div>';
  const acts=(wbCan('benefit.allocation.generate')?'<button class="btn btn-primary btn-sm" onclick="wbStartGenerate()">Generate allocations</button>':'')
    +(wbCan('benefit.entitlement.export')?'<button class="btn btn-outline btn-sm" onclick="wbExportEntitlements()">Export</button>':'');
  return wbListShell('e',{cols:9,sig:period,empty:'No entitlements for '+wbPeriodLabel(period)+' match this filter.',
    context:'Eligibility: 15th-of-month rule, no proration',
    top:periodPick+wbProjectionHTML(pr,period),
    actions:acts,
    filters:wbFilterBar('e','Search employee',[
      {k:'x',opts:wbDepts(),ph:'All Departments'},{k:'y',opts:wbDesigs(),ph:'All Designations'},
      {k:'z',opts:wbMine(wbCategories).map(function(c){return c.name;}),ph:'All Categories'}]),
    tiles:['Eligible','Not Eligible','Conflict','Tax Advisory'].map(function(s){return wbStat('e',s,count(s));}).join(''),
    head:'<th>S. No</th><th>Employee</th><th>Benefit</th><th>Source</th><th>Frequency</th><th>Amount</th><th>Eligibility</th><th>Allocation</th><th>Action</th>',
    rows:shown.map(function(r,i){
      const tax=wbTaxFlags(r);
      const amt=r.conflict?'—':(r.due?wbMoney(r.amount):'<span class="wb-muted">'+wbMoney(r.amount)+'</span>');
      return wbRowOpen('e',r.id)
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-main">'+sbEsc(r.emp.name)+'</div><div class="lp-c-sub">'+r.emp.empId+' · '+sbEsc(r.emp.desig)+'</div></td>'
        +'<td><div class="lp-c-plain">'+sbEsc(r.cat.name)+'</div><div class="lp-c-sub">'+(r.wallet?sbEsc(wbTypeName(r.wallet.type))+' wallet':'Claim-Based')+'</div></td>'
        +'<td><div class="lp-c-plain ax-c-trunc">'+sbEsc(wbSourceText(r))+'</div></td>'
        +'<td><div class="lp-c-plain">'+r.freq+'</div>'+(r.dueNote?'<div class="lp-c-sub">'+r.dueNote+'</div>':'')+'</td>'
        +'<td><div class="lp-c-plain">'+amt+'</div>'+(tax.length?'<div class="lp-c-sub wb-warn" title="'+attrSafe(tax.map(function(x){return x.text;}).join(' '))+'">Tax advisory</div>':'')+'</td>'
        +'<td>'+wbBadge(r.state)+(r.state==='Not Eligible'?'<div class="lp-c-sub ax-c-trunc" title="'+attrSafe(r.elig.why)+'">'+sbEsc(r.elig.why)+'</div>':'')+'</td>'
        +'<td>'+wbBadge(wbAllocStatus(r))+'</td>'
        +'<td onclick="event.stopPropagation()">'
          +(wbCan('benefit.override.manage')?'<button class="btn btn-outline btn-sm" onclick="wbStartOverride(\''+r.emp.eid+'\','+r.cat.id+')">Override</button>':'')
        +'</td></tr>';
    })});
}

/* ── Allocation batches ───────────────────────────────────────────────── */
function wbListBatches(){
  const f=wbF.a,all=wbMine(wbBatches);
  const shown=all.filter(function(b){
    if(f.st&&b.status!==f.st)return false;
    if(f.x&&wbPeriodLabel(b.period)!==f.x)return false;
    return wbMatchQ({key:b.key,period:wbPeriodLabel(b.period),by:b.generatedBy,appr:b.approvedBy},f.q);
  });
  if(wbSel.a!=null&&!shown.some(function(b){return b.id===wbSel.a;}))wbSel.a=null;
  const count=function(s){return all.filter(function(b){return b.status===s;}).length;};
  const acts=wbCan('benefit.allocation.generate')?'<button class="btn btn-primary btn-sm" onclick="wbStartGenerate()">Generate allocations</button>':'';
  return wbListShell('a',{cols:8,empty:'No allocation batches yet. Generate one from Entitlements.',
    context:'Generated by one person, approved by another',
    actions:acts,
    filters:wbFilterBar('a','Search batches',[{k:'x',opts:wbPeriods().map(wbPeriodLabel),ph:'All Periods'}]),
    tiles:['Planned','Pending Approval','Approved','Rejected'].map(function(s){return wbStat('a',s,count(s));}).join(''),
    head:'<th>S. No</th><th>Batch</th><th>Allocations</th><th>Planned Amount</th><th>Generated By</th><th>Approved By</th><th>Status</th><th>Action</th>',
    rows:shown.map(function(b,i){
      const flags=wbBatchFlags(b).length;
      return wbRowOpen('a',b.id)
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-main ax-c-link">'+wbPeriodLabel(b.period)+'</div><div class="lp-c-sub">'+b.key+(b.replaces?' · replaces '+wbRec('a',b.replaces).key:'')+'</div></td>'
        +'<td><div class="lp-c-plain">'+wbBatchLive(b).length+'</div>'+(flags?'<div class="lp-c-sub wb-warn">'+flags+' flagged</div>':'')+'</td>'
        +'<td><div class="lp-c-plain">'+wbMoney(wbBatchTotal(b))+'</div></td>'
        +'<td><div class="lp-c-plain">'+sbEsc(b.generatedBy)+'</div><div class="lp-c-sub">'+String(b.generatedAt).split(' | ')[0]+'</div></td>'
        +'<td><div class="lp-c-plain">'+(b.approvedBy?sbEsc(b.approvedBy):'—')+'</div>'+(b.approvedAt?'<div class="lp-c-sub">'+String(b.approvedAt).split(' | ')[0]+'</div>':'')+'</td>'
        +'<td>'+wbBadge(b.status)+'</td>'
        +'<td onclick="event.stopPropagation()">'+rowLogCell('wb-a',b.id)+'</td></tr>';
    })});
}

/* ── Overrides ────────────────────────────────────────────────────────── */
function wbListOverrides(){
  const f=wbF.o,all=wbMine(wbOverrides);
  const shown=all.filter(function(r){
    const e=wbEmpById(r.eid);
    if(f.st&&wbShown('o',r)!==f.st)return false;
    if(f.x&&wbCatName(r.categoryId)!==f.x)return false;
    return wbMatchQ({key:r.key,name:e?e.name:'',id:e?e.empId:'',cat:wbCatName(r.categoryId),reason:r.reason},f.q);
  });
  if(wbSel.o!=null&&!shown.some(function(r){return r.id===wbSel.o;}))wbSel.o=null;
  const count=function(s){return all.filter(function(r){return wbShown('o',r)===s;}).length;};
  return wbListShell('o',{cols:8,empty:'No overrides match this filter.',
    context:'An override always wins over every policy',
    filters:wbFilterBar('o','Search overrides',[{k:'x',opts:wbMine(wbCategories).map(function(c){return c.name;}),ph:'All Categories'}]),
    tiles:['Active','Scheduled','Inactive','Expired'].map(function(s){return wbStat('o',s,count(s));}).join(''),
    head:'<th>S. No</th><th>Employee</th><th>Category</th><th>Override Amount</th><th>Replaces</th><th>Effective</th><th>Status</th><th>Action</th>',
    rows:shown.map(function(r,i){
      const e=wbEmpById(r.eid),gen=wbGeneralFor(r);
      return wbRowOpen('o',r.id)
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-main ax-c-link">'+sbEsc(e?e.name:'(employee not in this entity)')+'</div><div class="lp-c-sub">'+r.key+' · '+(e?e.empId:'')+'</div></td>'
        +'<td><div class="lp-c-plain">'+sbEsc(wbCatName(r.categoryId))+'</div></td>'
        +'<td><div class="lp-c-plain">'+wbMoney(r.amount)+'</div></td>'
        +'<td><div class="lp-c-plain ax-c-trunc">'+(gen?sbEsc(gen.p.key+' · '+wbMoney(gen.v.amount)):'No general policy')+'</div></td>'
        +'<td><div class="lp-c-plain">'+wbRange(r.effFrom,r.effTo)+'</div></td>'
        +'<td>'+wbBadge(wbShown('o',r))+'</td>'
        +'<td onclick="event.stopPropagation()">'+rowLogCell('wb-o',r.id)+'</td></tr>';
    })});
}
/* The general policy an override replaces, as it stands today (or at its start). */
function wbGeneralFor(o){
  const emp=wbEmpById(o.eid),c=wbRec('c',o.categoryId);if(!emp||!c)return null;
  const t=wbToday()<o.effFrom?o.effFrom:wbToday();
  let best=null;
  wbMine(wbPolicies).forEach(function(p){
    if(p.categoryId!==c.id)return;
    const hit=wbPolicyForPeriod(p,t.slice(0,7));
    if(!hit||!wbScopeHit(hit.v,emp))return;
    const rank=WB_SCOPE_RANK[hit.v.scope];
    if(!best||rank>best.rank)best={p:p,v:hit.v,rank:rank};
  });
  return best;
}

/* ── Tax thresholds ───────────────────────────────────────────────────── */
function wbListThresholds(){
  const f=wbF.t,all=wbMine(wbThresholds);
  const shown=all.filter(function(r){
    if(f.st&&wbShown('t',r)!==f.st)return false;
    if(f.x&&wbTypeName(r.walletType)!==f.x)return false;
    return wbMatchQ({key:r.key,name:r.name,src:r.source,w:wbTypeName(r.walletType)},f.q);
  });
  if(wbSel.t!=null&&!shown.some(function(r){return r.id===wbSel.t;}))wbSel.t=null;
  const count=function(s){return all.filter(function(r){return wbShown('t',r)===s;}).length;};
  return wbListShell('t',{cols:7,empty:'No tax thresholds match this filter.',
    context:'Advisory only · counted once Finance approves',
    filters:wbFilterBar('t','Search thresholds',[{k:'x',opts:wbTypesHere().filter(function(t){return t.eligible!=='Not eligible';}).map(function(t){return t.name;}),ph:'All Wallets'}]),
    tiles:['Active','Pending Approval','Draft','Expired'].map(function(s){return wbStat('t',s,count(s));}).join(''),
    head:'<th>S. No</th><th>Threshold</th><th>Wallet</th><th>Rule</th><th>Effective</th><th>Status</th><th>Action</th>',
    rows:shown.map(function(r,i){
      return wbRowOpen('t',r.id)
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(r.name)+'">'+sbEsc(r.name)+'</div><div class="lp-c-sub">'+r.key+'</div></td>'
        +'<td><div class="lp-c-plain">'+sbEsc(wbTypeName(r.walletType))+'</div></td>'
        +'<td><div class="lp-c-plain ax-c-trunc" title="'+attrSafe(wbThRuleText(r))+'">'+sbEsc(wbThRuleText(r))+'</div></td>'
        +'<td><div class="lp-c-plain">'+wbRange(r.effFrom,r.effTo)+'</div></td>'
        +'<td>'+wbBadge(wbShown('t',r))+'</td>'
        +'<td onclick="event.stopPropagation()">'+rowLogCell('wb-t',r.id)+'</td></tr>';
    })});
}

/* ── Detail panels ────────────────────────────────────────────────────── */
function wbTabsFor(kind){
  const L={
    w:[['basic-details','Basic Details'],['linked','Linked Categories'],['logs','Logs'],['history','History']],
    c:[['basic-details','Basic Details'],['linked','Linked Policies'],['logs','Logs'],['history','History']],
    p:[['basic-details','Basic Details'],['eligible','Eligible Employees'],['versions','Versions'],['logs','Logs'],['history','History']],
    o:[['basic-details','Basic Details'],['logs','Logs'],['history','History']],
    t:[['basic-details','Basic Details'],['logs','Logs'],['history','History']],
    a:[['basic-details','Summary'],['rows','Allocations'],['exceptions','Exceptions'],['logs','Logs'],['history','History']],
    e:[['basic-details','How it was worked out'],['allocs','Allocations']]
  }[kind];
  return L.map(function(x){return {id:x[0],label:x[1]};});
}
function wbRenderPanel(kind){
  const id=wbSel[kind];const r=wbRec(kind,id);if(!r)return '';
  const tab=wbPTab[kind]||'basic-details';
  const bar=axTabBar('wb'+kind,wbTabsFor(kind),tab,'wbNavFn_'+kind,'wbCloseFn_'+kind);
  let body='';
  if(tab==='logs'&&kind!=='e')body=wbLogsHTML(kind,r);
  else if(tab==='history')body=sbHistoryHTML(r);
  else body=WB_PANEL[kind](r,tab);
  return bar+'<div class="lp-isb-body">'+body+'</div>';
}
/* axTabBar takes function names; one per kind keeps the onclick strings plain. */
['w','c','p','o','t','a','e'].forEach(function(k){
  window['wbNavFn_'+k]=function(t){wbNav(k,t);};
  window['wbCloseFn_'+k]=function(){wbClose(k);};
});
function wbEditing(kind,r){return !!(wbEdit&&wbEdit.kind===kind&&wbEdit.id===r.id);}
function wbHero(kind,r,ico,name,meta,canEdit){
  return sbHero({icon:ico,name:sbEsc(name),meta:meta,status:wbBadge(wbShown(kind,r)),editing:wbEditing(kind,r),
    onEdit:canEdit?'wbStartEdit(\''+kind+'\')':''});
}
function wbDeps(kind,r){
  if(kind==='w')return wbMine(wbCategories).filter(function(c){return c.walletId===r.id&&c.status==='Active'&&wbShown('c',c)!=='Expired';});
  if(kind==='c')return wbMine(wbPolicies).filter(function(p){return p.categoryId===r.id&&p.status==='Active'&&wbShown('p',p)!=='Expired';});
  return [];
}
const WB_PANEL={
  w:function(r,tab){
    const t=wbType(r.type)||{};
    if(tab==='linked'){
      const cats=wbMine(wbCategories).filter(function(c){return c.walletId===r.id;});
      return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Categories on this wallet</span></div>'
        +(cats.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Category</th><th>Status</th><th>Active policies</th></tr></thead><tbody>'
          +cats.map(function(c){return '<tr><td class="csag-td">'+sbEsc(c.name)+' <span class="wb-muted">'+c.key+'</span></td><td class="csag-td">'+wbBadge(wbShown('c',c))+'</td><td class="csag-td">'+wbDeps('c',c).length+'</td></tr>';}).join('')
          +'</tbody></table></div>':'<div class="wb-empty-sm">No category uses this wallet yet.</div>')
        +'<div class="wb-note">Deactivating this wallet is refused while an active category depends on it.</div>';
    }
    if(wbEditing('w',r))return wbHero('w',r,WB_ICO.wallet,t.name,[r.key])+axInlineFormHTML(wbFieldsHTML('w',wbEdit.draft,true,r),'wbCancelEdit()','wbSaveEdit()');
    return wbHero('w',r,WB_ICO.wallet,t.name,[r.key,t.cls],wbCan('benefit.wallet.manage')&&r.status!=='Inactive')
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Wallet Type',sbEsc(t.name)+' <span class="ax-sub">'+t.code+'</span>')
      +axField(AX_ICO.fBox,'Classification',sbEsc(t.cls))
      +axField(AX_ICO.fUser,'Fund Ownership',sbEsc(t.owner))
      +axField(AX_ICO.fCash,'Funding Source',sbEsc(t.funding))
      +axField(AX_ICO.fTag,'Benefit Policy',sbEsc(t.eligible))
      +axField(AX_ICO.fBuild,'Entity',sbEsc(r.entity))
      +axField(AX_ICO.fCal,'Effective From',wbDate(r.effFrom))
      +axField(AX_ICO.fCal,'Effective To',r.effTo?wbDate(r.effTo):'Open-ended')
      +axField(AX_ICO.fTag,'Provider Wallet',typeof oncProvider==='function'&&oncProvider()?(oncProvider().wallets.indexOf(t.code)>=0?sbEsc(oncProvider().name)+' · supported':sbEsc(oncProvider().name)+' · not supported'):'No card programme enabled')
      +axField(AX_ICO.fUser,'Created By',sbEsc(r.createdBy))
      +axField(AX_ICO.fTag,'About this wallet',sbEsc(t.desc),true)
      +axField(AX_ICO.fTag,'Description',sbEsc(r.desc),true)
      +'</div><div class="wb-note">This is an internal configuration. It does not create or activate a bank wallet.</div>';
  },
  c:function(r,tab){
    if(tab==='linked'){
      const ps=wbMine(wbPolicies).filter(function(p){return p.categoryId===r.id;});
      return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Policies on this category</span></div>'
        +(ps.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Policy</th><th>Applies To</th><th>Amount</th><th>Status</th></tr></thead><tbody>'
          +ps.map(function(p){const v=wbCurV(p);return '<tr><td class="csag-td">'+sbEsc(p.name)+' <span class="wb-muted">'+p.key+'</span></td><td class="csag-td">'+v.scope+'</td><td class="csag-td">'+wbMoney(v.amount)+'</td><td class="csag-td">'+wbBadge(wbShown('p',p))+'</td></tr>';}).join('')
          +'</tbody></table></div>':'<div class="wb-empty-sm">No policy uses this category yet.</div>');
    }
    const w=wbWalletOf(r);
    if(wbEditing('c',r))return wbHero('c',r,WB_ICO.tag,r.name,[r.key])+axInlineFormHTML(wbFieldsHTML('c',wbEdit.draft,true,r),'wbCancelEdit()','wbSaveEdit()');
    return wbHero('c',r,WB_ICO.tag,r.name,[r.key,r.processing],wbCan('benefit.category.manage')&&r.status!=='Inactive')
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Category Name',sbEsc(r.name))
      +axField(AX_ICO.fTag,'Category Code',sbEsc(r.code))
      +axField(AX_ICO.fBox,'Processing Type',r.processing)
      +axField(AX_ICO.fCash,'Linked Wallet',w?sbEsc(wbWalletLabel(w)):'Not applicable')
      +axField(AX_ICO.fBox,'Linked Expense Category',sbEsc(r.expCat||'None'))
      +axField(AX_ICO.fBuild,'Entity',sbEsc(r.entity))
      +axField(AX_ICO.fCal,'Effective From',wbDate(r.effFrom))
      +axField(AX_ICO.fCal,'Effective To',r.effTo?wbDate(r.effTo):'Open-ended')
      +(r.processing==='Wallet-Funded'?axField(AX_ICO.fTag,'Card Spend Evidence',sbEsc(wbCatEvidenceText(r)),true):'')
      +axField(AX_ICO.fTag,'Description',sbEsc(r.desc),true)
      +'</div>'+(r.processing==='Wallet-Funded'&&(r.evidenceRules||[]).length?wbCatEvidenceRowsHTML(r):'')+'<div class="wb-note">A category is never treated as tax-exempt by itself. '
      +(r.processing==='Claim-Based'?'Claim-based entitlements are shown on the expense form as entitled / claimed / remaining; reimbursement rules and Capping Limit are unchanged.':'Wallet-funded entitlements become planned allocations; no claim is created.')+'</div>';
  },
  p:function(r,tab){
    const v=wbCurV(r),c=wbRec('c',r.categoryId),w=wbWalletOf(c);
    if(tab==='eligible')return wbPolicyEligibleHTML(r);
    if(tab==='versions'){
      return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Versions</span>'
        +(r.status==='Active'&&wbCan('benefit.policy.manage')?'<button class="btn btn-outline btn-sm" onclick="wbStartVersion('+r.id+')">New version</button>':'')+'</div>'
        +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Version</th><th>Amount</th><th>Frequency</th><th>Applies To</th><th>Effective</th><th>Reason</th></tr></thead><tbody>'
        +r.versions.slice().reverse().map(function(x){
          return '<tr><td class="csag-td">v'+x.v+(x===v?' <span class="wb-muted">current</span>':'')+'</td><td class="csag-td">'+wbMoney(x.amount)+'</td><td class="csag-td">'+sbEsc(wbFreqText(x))+'</td>'
            +'<td class="csag-td">'+x.scope+(x.scopeRef?' · '+sbEsc(wbScopeText(x)):'')+'</td><td class="csag-td">'+wbRange(x.effFrom,x.effTo)+'</td><td class="csag-td">'+sbEsc(x.reason||'Created')+'</td></tr>';
        }).join('')+'</tbody></table></div>'
        +'<div class="wb-note">Money fields of an Active policy are locked; a change is a new version from a future date.</div>';
    }
    if(wbEditing('p',r))return wbHero('p',r,WB_ICO.policy,r.name,[r.key])+axInlineFormHTML(wbFieldsHTML('p',wbEdit.draft,true,r),'wbCancelEdit()','wbSaveEdit()');
    const conf=r.status==='Draft'?wbPolicyConflicts(r):[];
    return wbHero('p',r,WB_ICO.policy,r.name,[r.key,'v'+v.v,c?c.name:''],wbCan('benefit.policy.manage')&&r.status!=='Inactive')
      +(conf.length?wbConflictHTML(conf):'')
      +wbAdvisoryHTML(wbPolicyTaxFlags(r.categoryId,v))
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Policy Name',sbEsc(r.name))
      +axField(AX_ICO.fBox,'Benefit Category',sbEsc(c?wbCatLabel(c):'—'))
      +axField(AX_ICO.fBox,'Processing Type',c?c.processing:'—')
      +axField(AX_ICO.fCash,'Linked Wallet',w?sbEsc(wbWalletLabel(w)):'Not applicable')
      +axField(AX_ICO.fUser,'Applies To',v.scope+' <span class="ax-sub">'+sbEsc(wbScopeText(v))+'</span>')
      +axField(AX_ICO.fCash,'Entitlement',wbMoney(v.amount)+' <span class="ax-sub">'+sbEsc(wbFreqText(v))+'</span>')
      +axField(AX_ICO.fCash,'Currency','INR')
      +axField(AX_ICO.fCal,'Effective Period',wbRange(r.effFrom,r.effTo))
      +axField(AX_ICO.fCash,'Funding Model',sbEsc(r.funding))
      +axField(AX_ICO.fCal,'Year-end Rule',sbEsc(r.yearEnd))
      +axField(AX_ICO.fTag,'Version','v'+v.v+' of '+r.versions.length)
      +axField(AX_ICO.fUser,'Created By',sbEsc(r.createdBy))
      +axField(AX_ICO.fTag,'Description',sbEsc(r.desc),true)
      +'</div>';
  },
  o:function(r){
    const e=wbEmpById(r.eid),gen=wbGeneralFor(r);
    if(wbEditing('o',r))return wbHero('o',r,WB_ICO.person,e?e.name:'',[r.key])+axInlineFormHTML(wbFieldsHTML('o',wbEdit.draft,true,r),'wbCancelEdit()','wbSaveEdit()');
    return wbHero('o',r,WB_ICO.person,e?e.name:'',[r.key,wbCatName(r.categoryId)],wbCan('benefit.override.manage')&&r.status!=='Inactive')
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fUser,'Employee',sbEsc(e?wbEmpLabel(e):'(employee not in this entity)'))
      +axField(AX_ICO.fBox,'Benefit Category',sbEsc(wbCatName(r.categoryId)))
      +axField(AX_ICO.fTag,'Current Policy',gen?sbEsc(gen.p.key+' · '+gen.p.name+' ('+gen.v.scope+')'):'No general policy applies')
      +axField(AX_ICO.fCash,'Current Entitlement',gen?wbMoney(gen.v.amount)+' <span class="ax-sub">'+sbEsc(wbFreqText(gen.v))+'</span>':'—')
      +axField(AX_ICO.fCash,'Override Amount',wbMoney(r.amount))
      +axField(AX_ICO.fCal,'Frequency',gen?sbEsc(wbFreqText(gen.v))+' <span class="ax-sub">taken from the policy it replaces</span>':'Monthly <span class="ax-sub">no policy to take it from</span>')
      +axField(AX_ICO.fCal,'Effective Period',wbRange(r.effFrom,r.effTo))
      +axField(AX_ICO.fUser,'Created By',sbEsc(r.createdBy))
      +axField(AX_ICO.fTag,'Reason',sbEsc(r.reason),true)
      +'</div><div class="wb-note">An override replaces the general entitlement; it is never added to it.</div>';
  },
  t:function(r){
    if(wbEditing('t',r))return wbHero('t',r,WB_ICO.scale,r.name,[r.key])+axInlineFormHTML(wbFieldsHTML('t',wbEdit.draft,true,r),'wbCancelEdit()','wbSaveEdit()');
    const canEdit=wbCan('benefit.tax.manage')&&(r.status==='Draft'||r.status==='Rejected');
    return wbHero('t',r,WB_ICO.scale,r.name,[r.key,wbTypeName(r.walletType)],canEdit)
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Threshold',sbEsc(r.name))
      +axField(AX_ICO.fCash,'Wallet',sbEsc(wbTypeName(r.walletType)))
      +axField(AX_ICO.fBox,'Basis',r.basis+' · '+r.rule)
      +axField(AX_ICO.fCash,'Rule',sbEsc(wbThRuleText(r)))
      +axField(AX_ICO.fCal,'Effective Period',wbRange(r.effFrom,r.effTo))
      +axField(AX_ICO.fTag,'Source',sbEsc(r.source))
      +axField(AX_ICO.fUser,'Created By',sbEsc(r.createdBy))
      +axField(AX_ICO.fUser,'Submitted By',sbEsc(r.submittedBy||'—'))
      +axField(AX_ICO.fUser,'Approved By (Finance)',sbEsc(r.approvedBy||'Not approved'))
      +axField(AX_ICO.fTag,'Note',sbEsc(r.note),true)
      +'</div><div class="wb-note">Advisory only: it flags entitlements above the reference; it never blocks or calculates tax.</div>';
  },
  a:function(b,tab){
    const flags=wbBatchFlags(b);
    if(tab==='rows'){
      const canCancel=(b.status==='Planned'||b.status==='Rejected')&&wbCan('benefit.allocation.generate');
      return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Allocations ('+wbBatchLive(b).length+')</span>'
        +(canCancel?'<button class="btn btn-outline btn-sm" onclick="wbStartRecalc('+b.id+')">Recalculate</button>':'')+'</div>'
        +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Allocation</th><th>Employee</th><th>Category</th><th>Source</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>'
        +b.rows.map(function(x){
          const fl=wbRowFlag(x);
          return '<tr><td class="csag-td">'+x.key+'</td><td class="csag-td">'+sbEsc(x.empName)+'<div class="wb-muted">'+x.empId+'</div></td><td class="csag-td">'+sbEsc(x.categoryName)+'</td>'
            +'<td class="csag-td">'+x.sourceKey+(x.policyVersion?' v'+x.policyVersion:'')+'</td>'
            +'<td class="csag-td">'+wbMoney(x.amount)+(x.prevAmount!=null&&x.prevAmount!==x.amount?'<div class="wb-muted">was '+wbMoney(x.prevAmount)+'</div>':'')+'</td>'
            +'<td class="csag-td">'+wbBadge(x.status)+(fl?'<div class="wb-warn">'+sbEsc(fl)+'</div>':'')+(x.cancelReason?'<div class="wb-muted">'+sbEsc(x.cancelReason)+'</div>':'')+'</td>'
            +'<td class="csag-td">'+(canCancel&&x.status==='Planned'?'<button class="btn btn-outline btn-sm" onclick="wbStartCancelRow('+b.id+','+x.id+')">Cancel</button>':'')+'</td></tr>';
        }).join('')+'</tbody></table></div>';
    }
    if(tab==='exceptions'){
      return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Left out at generation ('+b.exceptions.length+')</span></div>'
        +(b.exceptions.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Employee</th><th>Category</th><th>Why</th></tr></thead><tbody>'
          +b.exceptions.map(function(x){return '<tr><td class="csag-td">'+sbEsc(x.name)+'<div class="wb-muted">'+x.empId+'</div></td><td class="csag-td">'+sbEsc(x.cat)+'</td><td class="csag-td">'+sbEsc(x.why)+'</td></tr>';}).join('')
          +'</tbody></table></div>':'<div class="wb-empty-sm">Nobody was left out.</div>');
    }
    const by=function(fn){const m={};wbBatchLive(b).forEach(function(x){const k=fn(x);m[k]=(m[k]||0)+x.amount;});return m;};
    const tbl=function(m,h){const ks=Object.keys(m);return ks.length?'<div class="wb-proj-tbl"><div class="wb-proj-h">'+h+'</div><div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><tbody>'
      +ks.map(function(k){return '<tr><td class="csag-td">'+sbEsc(k)+'</td><td class="csag-td wb-num">'+wbMoney(m[k])+'</td></tr>';}).join('')+'</tbody></table></div></div>':'';};
    const repl=b.status==='Approved'&&wbCan('benefit.allocation.generate')&&!wbMine(wbBatches).some(function(x){return x.replaces===b.id&&WB_LIVE_BATCH.indexOf(x.status)>=0;});
    return sbHero({icon:WB_ICO.batch,name:'Allocations · '+wbPeriodLabel(b.period),meta:[b.key,wbBatchLive(b).length+' allocations'],status:wbBadge(b.status)})
      +(flags.length?'<div class="wb-note is-bad"><b>'+flags.length+' flagged</b> · '+flags.map(function(f){return sbEsc(f.row.empName+': '+f.why);}).join('<br>')
        +'<div class="wb-note-sub">'+(b.status==='Approved'?'Approved batches are locked. Create a replacement batch before this period is funded.':'Cancel or recalculate these rows before the batch can be approved.')+'</div></div>':'')
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fCal,'Period',wbPeriodLabel(b.period))
      +axField(AX_ICO.fCash,'Planned Amount',wbMoney(wbBatchTotal(b)))
      +axField(AX_ICO.fTag,'Allocations',String(wbBatchLive(b).length))
      +axField(AX_ICO.fTag,'Left Out',String(b.exceptions.length))
      +axField(AX_ICO.fUser,'Generated By',sbEsc(b.generatedBy)+' <span class="ax-sub">'+sbEsc(b.generatedRole)+' · '+sbEsc(b.generatedAt)+'</span>')
      +axField(AX_ICO.fUser,'Approved By',b.approvedBy?sbEsc(b.approvedBy)+' <span class="ax-sub">'+sbEsc(b.approvedAt)+'</span>':'Not approved')
      +axField(AX_ICO.fTag,'Replaces',b.replaces?wbRec('a',b.replaces).key:'—')
      +axField(AX_ICO.fTag,'Replaced By',b.replacedBy?wbRec('a',b.replacedBy).key:'—')
      +'</div>'
      +tbl(by(function(x){return x.walletType?wbTypeName(x.walletType):'Claim-Based';}),'By wallet')
      +tbl(by(function(x){return x.categoryName;}),'By category')
      +'<div class="wb-note">Planned allocation, not a wallet load: no money moves and no balance is shown.</div>'
      +(repl?'<div class="wb-actions"><button class="btn btn-outline btn-sm" onclick="wbStartReplace('+b.id+')">Create replacement batch</button></div>':'');
  },
  e:function(r,tab){
    if(tab==='allocs'){
      const rows=[];
      wbMine(wbBatches).forEach(function(b){b.rows.forEach(function(x){if(x.eid===r.emp.eid&&x.categoryId===r.cat.id)rows.push({b:b,x:x});});});
      return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Allocations for '+sbEsc(r.emp.name)+' · '+sbEsc(r.cat.name)+'</span></div>'
        +(rows.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Period</th><th>Batch</th><th>Amount</th><th>Source</th><th>Status</th></tr></thead><tbody>'
          +rows.map(function(o){return '<tr><td class="csag-td">'+wbPeriodLabel(o.x.period)+'</td><td class="csag-td">'+o.b.key+'</td><td class="csag-td">'+wbMoney(o.x.amount)+'</td><td class="csag-td">'+o.x.sourceKey+'</td><td class="csag-td">'+wbBadge(o.x.status==='Planned'?o.b.status:o.x.status)+'</td></tr>';}).join('')
          +'</tbody></table></div>':'<div class="wb-empty-sm">No allocations generated yet.</div>');
    }
    const tax=wbTaxFlags(r);
    const cands=r.cands.map(function(c,i){
      const win=r.source&&r.source.type==='Policy'&&r.source.rec===c.p;
      const tie=r.conflict&&r.conflict.indexOf(c.p)>=0;
      return '<tr><td class="csag-td">'+(i+1)+'</td><td class="csag-td">'+sbEsc(c.p.name)+'<div class="wb-muted">'+c.p.key+' v'+c.v.v+'</div></td><td class="csag-td">'+c.v.scope+'</td>'
        +'<td class="csag-td">'+wbMoney(c.v.amount)+'</td><td class="csag-td">'+(win?wbBadge('Applies'):tie?wbBadge('Conflict'):'<span class="wb-muted">Lower priority - not added</span>')+'</td></tr>';
    }).join('');
    return sbHero({icon:WB_ICO.person,name:sbEsc(r.emp.name),meta:[r.emp.empId,r.cat.name,wbPeriodLabel(r.period)],status:wbBadge(r.state)})
      +(r.conflict?wbConflictHTML(r.conflict.map(function(p){return {p:p,why:'Same level ('+wbCurV(p).scope+') for the same person and category'};})):'')
      +wbAdvisoryHTML(tax.map(function(x){return x.text;}))
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fUser,'Employee',sbEsc(r.emp.name)+' <span class="ax-sub">'+sbEsc(r.emp.dept)+' · '+sbEsc(r.emp.desig)+'</span>')
      +axField(AX_ICO.fCal,'Joining / Last Working Date',wbDate(r.emp.join)+(r.emp.lwd?' → '+wbDate(r.emp.lwd):''))
      +axField(AX_ICO.fTag,'Lifecycle Status',sbEsc(r.emp.status))
      +axField(AX_ICO.fCal,'Tested On',wbDate(r.ref)+' <span class="ax-sub">'+(r.freq==='One-time'?'occasion date':'15th-of-month rule')+'</span>')
      +axField(AX_ICO.fTag,'Eligibility',sbEsc(r.elig.why))
      +axField(AX_ICO.fCash,'Entitlement',r.conflict?'Held until the conflict is resolved':wbMoney(r.amount)+' <span class="ax-sub">'+r.freq+(r.dueNote?' · '+r.dueNote:'')+'</span>')
      +axField(AX_ICO.fTag,'Decided By',sbEsc(wbSourceText(r)))
      +axField(AX_ICO.fTag,'Allocation',wbAllocStatus(r))
      +'</div>'
      +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Policies that match ('+r.cands.length+')</span></div>'
      +(r.source&&r.source.type==='Override'?'<div class="wb-note">Override '+r.source.rec.key+' ('+wbMoney(r.source.rec.amount)+') wins over every policy below. Reason: '+sbEsc(r.source.rec.reason)+'</div>':'')
      +(r.cands.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>#</th><th>Policy</th><th>Level</th><th>Amount</th><th>Outcome</th></tr></thead><tbody>'+cands+'</tbody></table></div>'
        :'<div class="wb-empty-sm">No policy matches; the override is the only source.</div>')
      +'<div class="wb-note">Order: Override › Employee › Designation › Department › Entity. The highest level decides; lower amounts are never added.</div>'
      +(wbCan('benefit.override.manage')?'<div class="wb-actions"><button class="btn btn-outline btn-sm" onclick="wbStartOverride(\''+r.emp.eid+'\','+r.cat.id+')">Configure override</button></div>':'');
  }
};
function wbConflictHTML(list){
  return '<div class="wb-note is-bad"><b>Conflict</b> · '+list.map(function(c){return sbEsc((c.p?c.p.key+' '+c.p.name:'')+(c.why?' - '+c.why:''));}).join('<br>')
    +'<div class="wb-note-sub">Two policies at the same level cannot both apply. End-date one, narrow its scope, or deactivate it.</div></div>';
}
/* Preview eligibility (WB-07/08): who the policy reaches in the current
   period, what each of them gets from it, and what that costs. */
function wbPolicyEligibleHTML(p){
  const period=wbCurPeriod();
  const v=wbCurV(p);
  const rows=[];let applies=0,cost=0;
  wbEmployees().forEach(function(emp){
    if(!wbScopeHit(v,emp))return;
    const c=wbRec('c',p.categoryId);
    let out,amt='—';
    const r=c?wbResolve(emp,c,period):null;
    const ref=v.frequency==='One-time'&&v.occasion?v.occasion:period+'-15';
    const el=wbElig(emp,ref,v.frequency==='One-time');
    if(p.status==='Draft'){out=el.ok?'Would apply':'Not eligible - '+el.why;if(el.ok){amt=wbMoney(v.amount);applies++;cost+=Number(v.amount)||0;}}
    else if(!r){out='Not in force for '+wbPeriodLabel(period);}
    else if(r.conflict&&r.conflict.indexOf(p)>=0){out='Conflict';}
    else if(r.source&&r.source.type==='Override'){out='Replaced by override '+r.source.rec.key+' ('+wbMoney(r.source.rec.amount)+')';}
    else if(r.source&&r.source.rec!==p){out='Replaced by higher-priority '+r.source.rec.key+' ('+r.source.v.scope+')';}
    else if(!r.elig.ok){out='Not eligible - '+r.elig.why;}
    else {out='Applies';amt=wbMoney(r.amount);applies++;cost+=r.amount;}
    rows.push('<tr><td class="csag-td">'+sbEsc(emp.name)+'<div class="wb-muted">'+emp.empId+' · '+sbEsc(emp.dept)+' · '+sbEsc(emp.desig)+'</div></td><td class="csag-td">'+sbEsc(out)+'</td><td class="csag-td">'+amt+'</td></tr>');
  });
  let year=0;
  if(p.status!=='Draft'){
    wbFYPeriods(wbFYOf(period)).forEach(function(per){
      wbEmployees().forEach(function(emp){
        const c=wbRec('c',p.categoryId);const r=c?wbResolve(emp,c,per):null;
        if(r&&wbAllocatable(r)&&r.source&&r.source.rec===p)year+=r.amount;
      });
    });
  }
  return '<div class="wb-proj-cards">'
    +'<div class="wb-proj-card"><span>'+(p.status==='Draft'?'Would reach':'Reaches')+' in '+wbPeriodLabel(period)+'</span><b>'+applies+' of '+rows.length+'</b><em>employees in scope</em></div>'
    +'<div class="wb-proj-card"><span>Cost '+(v.frequency==='Monthly'?'per month':'this period')+'</span><b>'+wbMoney(cost)+'</b><em>'+(p.status==='Draft'?'if activated as it stands':wbFYLabel(wbFYOf(period))+': '+wbMoney(year))+'</em></div>'
    +'</div>'
    +(rows.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Employee</th><th>Outcome</th><th>Amount</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div>'
      :'<div class="wb-empty-sm">Nobody is in this policy\'s scope.</div>');
}

/* ── Logs ─────────────────────────────────────────────────────────────── */
function wbSeedLogs(kind,r){
  if(r.logs&&r.logs.length)return r.logs;
  const p=String(r.createdAt||'').split(' | ');
  const fx=[wbLog(p[0]||wbDate(wbToday()),p[1]||'09:00:00 AM',r.createdBy||'System','Draft','Created as draft.')];
  if(kind==='t'&&r.submittedBy)fx.unshift(wbLog(p[0],'11:00:00 AM',r.submittedBy,'Pending Approval','Submitted for Finance approval.'));
  if(r.activatedOn&&kind!=='t')fx.unshift(wbLog(wbDate(r.activatedOn),'10:00:00 AM',r.createdBy,'Active','Activated.'));
  if(kind==='t'&&r.approvedBy)fx.unshift(wbLog(wbDate(r.activatedOn||wbToday()),'04:00:00 PM',r.approvedBy,'Active','Approved by Finance.'));
  if(kind==='o')fx.splice(fx.length-1,1);
  return seedLogs(r,fx);
}
function wbLogsHTML(kind,r){
  const pre='wb'+kind,cur=wbShown(kind,r),moves=wbMoves(kind,r);
  const form='<div class="lp-logs-form">'
    +'<div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+cur+'</div>'
    +'<p class="lp-logs-form-sub">Move this '+WB_KIND_NAME[kind]+' on and say why</p>'
    +lpLogStatusField(pre+'-log-status-sel',cur,[cur].concat(moves))
    +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="lp-logs-form-textarea" id="'+pre+'-log-comment-inp" placeholder="Enter comment"></textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px">'
    +'<button class="ep-cancel-btn" style="flex:1" onclick="wbNav(\''+kind+'\',\'logs\')">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="wbCommitLog(\''+kind+'\','+r.id+')">Submit</button>'
    +'</div></div>';
  return lpLogsView(wbSeedLogs(kind,r),form,{labels:WB_MOVE_LABELS[kind]});
}
/* Every status move: validate the form, check the move is legal and allowed
   for this role and person, apply its side effects, and log it. */
function wbCommitLog(kind,id){
  const r=wbRec(kind,id);if(!r)return false;
  const pre='wb'+kind;
  const sel=csTrigger(pre+'-log-status-sel');
  const inp=document.getElementById(pre+'-log-comment-inp');
  const to=getCSValue(pre+'-log-status-sel');
  const comment=inp?inp.value.trim():'';
  const flash=function(el){if(el){el.style.borderColor='#b83a3a';setTimeout(function(){el.style.borderColor='';},1500);}};
  if(!to){flash(sel);return false;}
  if(!comment){flash(inp);return false;}
  const cur=wbShown(kind,r);
  wbSeedLogs(kind,r);
  const s=stampNow();
  if(to===cur||to===r.status){
    r.logs.unshift(wbLog(s.date,s.time,wbActor(),cur,comment));
    renderADTPage();showToast('Comment added','success',(r.key||'')+' stays '+cur+'.');return true;
  }
  if(wbMoves(kind,r).indexOf(to)<0){showToast('That move is not allowed','error',cur+' cannot move to '+to+'.');return false;}
  const note=wbGuard(kind,r,to);
  if(note===false)return false;
  wbApply(kind,r,to);
  r.logs.unshift(wbLog(s.date,s.time,wbActor(),wbShown(kind,r),comment+(note?' '+note:'')));
  renderADTPage();
  showToast('Log added','success',(r.key||'')+' is now '+wbShown(kind,r)+'.');
  return true;
}
function wbList(items,fmt){return items.map(fmt).join(', ');}
/* Returns false (refused, toast shown), '' or a note for the log. */
function wbGuard(kind,r,to){
  const perm={w:'benefit.wallet.activate',c:'benefit.category.manage',p:'benefit.policy.activate',o:'benefit.override.manage'}[kind];
  if(perm&&!wbCan(perm))return wbDeny('change the status of a '+WB_KIND_NAME[kind]);
  if(kind==='w'){
    if(to==='Active'){
      const t=wbType(r.type);if(!t||t.status!=='Active'){showToast('Wallet type is not active in the catalogue','error');return false;}
      const twin=wbWalletTwin(r);if(twin){showToast('Overlapping configuration','error',twin.key+' already covers '+wbTypeName(r.type)+' for these dates.');return false;}
    }
    if(to==='Inactive'){const d=wbDeps('w',r);if(d.length){showToast('Active categories depend on this wallet','error',wbList(d,function(c){return c.key+' '+c.name;})+'. Deactivate them first.');return false;}}
  }
  if(kind==='c'){
    if(to==='Active'&&!wbCatCheckActivate(r))return false;
    if(to==='Inactive'){const d=wbDeps('c',r);if(d.length){showToast('Active policies use this category','error',wbList(d,function(p){return p.key+' '+p.name;})+'. Deactivate or end-date them first.');return false;}}
  }
  if(kind==='p'&&to==='Active'){
    if(!wbPolicyCheckActivate(r))return false;
  }
  if(kind==='o'&&to==='Active'){
    const twin=wbOverrideTwin(r);if(twin){showToast('Overlapping override','error',twin.key+' already covers this employee and category for these dates.');return false;}
  }
  if(kind==='t'){
    if(to==='Pending Approval'||to==='Draft'||to==='Inactive'){if(!wbCan('benefit.tax.manage'))return wbDeny('change a tax threshold');}
    if(to==='Active'||to==='Rejected'){
      if(!wbCan('benefit.tax.approve'))return wbDeny('approve or reject a tax threshold (Finance only)');
      if(wbActorId()===r.submittedById||wbActorId()===r.createdById){showToast('Maker cannot be checker','error',wbActor()+' prepared this threshold. Another Finance user must decide it.');return false;}
    }
    if(to==='Active'){
      const older=wbMine(wbThresholds).filter(function(x){return x!==r&&x.status==='Active'&&x.walletType===r.walletType&&x.basis===r.basis&&wbOverlap(x.effFrom,x.effTo,r.effFrom,r.effTo);});
      const block=older.find(function(x){return x.effFrom>=r.effFrom;});
      if(block){showToast('Overlapping threshold','error',block.key+' starts on or after this one. Change the dates first.');return false;}
      return older.length?'Supersedes '+older.map(function(x){return x.key;}).join(', ')+' from '+wbDate(r.effFrom)+'.':'';
    }
  }
  if(kind==='a'){
    if(to==='Approved'||to==='Rejected'){
      if(!wbCan('benefit.allocation.approve'))return wbDeny('approve or reject an allocation batch');
      if(wbActorId()===r.generatedById||wbActorId()===r.submittedById){showToast('Maker cannot be checker','error',wbActor()+' generated or submitted '+r.key+'. Another approver must decide it.');return false;}
    }else if(!wbCan('benefit.allocation.generate'))return wbDeny('change an allocation batch');
    if(to==='Pending Approval'&&!wbBatchLive(r).length){showToast('Nothing to approve','error',r.key+' has no allocations.');return false;}
    if(to==='Approved'){
      const fl=wbBatchFlags(r);
      if(fl.length){showToast(fl.length+' flagged allocation'+(fl.length>1?'s':''),'error','Cancel or recalculate them first: '+wbList(fl,function(f){return f.row.empName;})+'.');return false;}
      const other=wbMine(wbBatches).find(function(x){return x!==r&&x.period===r.period&&x.status==='Approved'&&x.id!==r.replaces;});
      if(other){showToast('Period already approved','error',other.key+' is the approved batch for '+wbPeriodLabel(r.period)+'.');return false;}
    }
    if(to==='Planned'&&r.status==='Rejected'){
      const live=wbMine(wbBatches).find(function(x){return x!==r&&x.period===r.period&&(x.status==='Planned'||x.status==='Pending Approval');});
      if(live){showToast('Another batch is open for this period','error',live.key+' is '+live.status+'.');return false;}
    }
  }
  return '';
}
/* Side effects of a move. Deactivating end-dates (history stays true);
   reactivating restores the dates it had. */
function wbEndDate(r){
  const t=wbToday();r.restoreTo=r.effTo;
  if(r.effFrom&&r.effFrom>t)r.effTo=wbAddDays(r.effFrom,-1);
  else if(!r.effTo||r.effTo>t)r.effTo=t;
}
function wbApply(kind,r,to){
  const s=stampNow();
  if(kind==='p'){
    if(to==='Inactive'){
      const t=wbToday();
      r.restore=r.versions.map(function(v){return v.effTo;});
      r.versions.forEach(function(v){if(v.effFrom>t)v.effTo=wbAddDays(v.effFrom,-1);else if(!v.effTo||v.effTo>t)v.effTo=t;});
    }
    if(to==='Active'){
      if(r.status==='Inactive'&&r.restore){r.versions.forEach(function(v,i){v.effTo=r.restore[i];});r.restore=null;}
      r.activatedOn=r.activatedOn||wbToday();
    }
    r.status=to;wbPSync(r);return;
  }
  if(kind==='w'||kind==='c'||kind==='o'){
    if(to==='Inactive'&&r.status!=='Draft')wbEndDate(r);
    if(to==='Active'){if(r.status==='Inactive'&&r.restoreTo!==undefined){r.effTo=r.restoreTo;r.restoreTo=undefined;}r.activatedOn=r.activatedOn||wbToday();}
    r.status=to;return;
  }
  if(kind==='t'){
    if(to==='Pending Approval'){r.submittedBy=wbActor();r.submittedById=wbActorId();}
    if(to==='Active'){
      wbMine(wbThresholds).forEach(function(x){
        if(x!==r&&x.status==='Active'&&x.walletType===r.walletType&&x.basis===r.basis&&wbOverlap(x.effFrom,x.effTo,r.effFrom,r.effTo)){
          x.effTo=wbAddDays(r.effFrom,-1);wbSeedLogs('t',x);
          x.logs.unshift(wbLog(s.date,s.time,wbActor(),wbShown('t',x),'Superseded by '+r.key+' from '+wbDate(r.effFrom)+'.'));
        }
      });
      r.approvedBy=wbActor();r.approvedById=wbActorId();r.activatedOn=wbToday();
    }
    if(to==='Rejected'){r.rejectedBy=wbActor();r.rejectedById=wbActorId();}
    if(to==='Inactive'&&r.status==='Active')wbEndDate(r);
    r.status=to;return;
  }
  if(kind==='a'){
    if(to==='Pending Approval'){r.submittedBy=wbActor();r.submittedById=wbActorId();}
    if(to==='Approved'){
      r.approvedBy=wbActor();r.approvedById=wbActorId();r.approvedAt=s.date+' | '+s.time;
      if(r.replaces){
        const old=wbRec('a',r.replaces);
        if(old){old.status='Superseded';old.replacedBy=r.id;old.rows.forEach(function(x){if(x.status==='Planned')x.status='Superseded';});
          wbSeedLogs('a',old);old.logs.unshift(wbLog(s.date,s.time,wbActor(),'Superseded','Replaced by '+r.key+' on approval.'));}
      }
    }
    if(to==='Cancelled')r.rows.forEach(function(x){if(x.status==='Planned'){x.status='Cancelled';x.cancelReason='Batch cancelled';}});
    r.status=to;return;
  }
}

/* ── Validation ───────────────────────────────────────────────────────── */
function wbWalletTwin(r){
  return wbMine(wbWallets).find(function(x){return x!==r&&x.id!==r.id&&x.type===r.type&&(x.status==='Active'||x.status==='Draft')&&wbOverlap(x.effFrom,x.effTo,r.effFrom,r.effTo);})||null;
}
function wbOverrideTwin(r){
  return wbMine(wbOverrides).find(function(x){return x!==r&&x.id!==r.id&&x.eid===r.eid&&x.categoryId===r.categoryId&&x.status==='Active'&&wbOverlap(x.effFrom,x.effTo,r.effFrom,r.effTo);})||null;
}
function wbCatCheckActivate(r){
  if(r.processing==='Wallet-Funded'){
    const w=wbWalletOf(r);
    if(!w||w.status!=='Active'||wbShown('w',w)==='Expired'){showToast('Linked wallet is not active','error','Activate '+(w?w.key:'a wallet')+' first.');return false;}
    const t=wbType(w.type);
    if(!t||t.eligible==='Not eligible'){showToast('Wallet not eligible for benefits','error',(t?t.name:'This wallet')+' cannot fund a benefit category.');return false;}
  }
  const dup=wbMine(wbCategories).find(function(x){return x!==r&&(x.code.toLowerCase()===String(r.code).toLowerCase()||x.name.toLowerCase()===String(r.name).toLowerCase());});
  if(dup){showToast('Name or code already used','error',dup.key+' · '+dup.name);return false;}
  return true;
}
/* Two version ranges count as overlapping when both can apply in one period. */
function wbVOverlap(a,b){
  if(a.frequency==='One-time'&&b.frequency==='One-time')return !!a.occasion&&!!b.occasion&&a.occasion.slice(0,7)===b.occasion.slice(0,7);
  if(a.frequency==='One-time')return !!a.occasion&&wbInRange(a.occasion,b.effFrom,b.effTo);
  if(b.frequency==='One-time')return !!b.occasion&&wbInRange(b.occasion,a.effFrom,a.effTo);
  return wbOverlap(a.effFrom,a.effTo,b.effFrom,b.effTo);
}
function wbPolicyConflicts(p,versions){
  const vs=versions||p.versions;const out=[];
  wbMine(wbPolicies).forEach(function(q){
    if(q===p||q.id===p.id||q.categoryId!==p.categoryId||!q.activatedOn||!(q.status==='Active'||q.status==='Inactive'))return;
    q.versions.forEach(function(qv){
      if(qv.effTo&&qv.effFrom>qv.effTo)return;
      vs.forEach(function(v){
        if(v.scope===qv.scope&&v.scopeRef===qv.scopeRef&&wbVOverlap(v,qv)&&!out.some(function(o){return o.p===q;}))
          out.push({p:q,why:'Same '+v.scope.toLowerCase()+(v.scopeRef?' ('+wbScopeText(v)+')':'')+' and overlapping dates: '+wbRange(qv.effFrom,qv.effTo)});
      });
    });
  });
  return out;
}
function wbPolicyCheckActivate(p){
  const c=wbRec('c',p.categoryId);
  if(!c||c.status!=='Active'||wbShown('c',c)==='Expired'){showToast('Category is not active','error','Activate '+(c?c.key:'the category')+' first (VAL-03).');return false;}
  for(let i=0;i<p.versions.length;i++){if(!wbVersionCheck(p.versions[i],c))return false;}
  const conf=wbPolicyConflicts(p);
  if(conf.length){showToast('Policy conflict','error',wbList(conf,function(x){return x.p.key+' '+x.p.name;})+'. See Basic Details.');return false;}
  return true;
}
function wbVersionCheck(v,c){
  if(!(Number(v.amount)>0)){showToast('Entitlement Amount must be more than 0','error');return false;}
  if(!v.effFrom){showToast('Effective From is required','error');return false;}
  if(v.effTo&&v.effTo<v.effFrom){showToast('Effective To cannot be before Effective From','error');return false;}
  if(v.scope==='Department'&&wbDepts().indexOf(v.scopeRef)<0){showToast('Department not found','error','Pick an active department from Company Structure.');return false;}
  if(v.scope==='Branch'&&(typeof wbBranches!=='function'||wbBranches().indexOf(v.scopeRef)<0)){showToast('Branch not found','error','Pick an active branch from Company Structure.');return false;}
  if(v.scope==='Designation'&&wbDesigs().indexOf(v.scopeRef)<0){showToast('Designation not found','error','Pick an active designation from Company Structure.');return false;}
  if(v.scope==='Employee'&&!wbEmpById(v.scopeRef)){showToast('Employee not found in this entity','error');return false;}
  if(v.frequency==='Annual'&&!v.annualBasis){showToast('Annual Period Basis is required','error');return false;}
  if(v.frequency==='One-time'){
    if(!v.occasion){showToast('Occasion Date is required for a one-time policy','error');return false;}
    if(!wbInRange(v.occasion,v.effFrom,v.effTo)){showToast('Occasion Date must fall inside the effective period','error');return false;}
  }
  return true;
}

/* ── Forms ────────────────────────────────────────────────────────────── */
/* What each form holds. 'in' = text/number input, 'cs' = apCS/axCS dropdown,
   'cd' = apCD date picker. Ids are wb<kind>-e-<field>. */
const WB_FORM={
  w:[['type','cs'],['newName','in'],['newCode','in'],['newCls','cs'],['newDesc','in'],['effFrom','cd'],['effTo','cd'],['desc','in']],
  c:[['name','in'],['code','in'],['processing','cs'],['wallet','cs'],['expCat','cs'],['effFrom','cd'],['effTo','cd'],['evidence','cs'],['evidenceFrom','cd'],['evidenceReason','in'],['desc','in']],
  p:[['name','in'],['category','cs'],['scope','cs'],['scopeRef','cs'],['frequency','cs'],['annualBasis','cs'],['occasion','cd'],['amount','in'],
     ['effFrom','cd'],['effTo','cd'],['funding','cs'],['yearEnd','cs'],['desc','in']],
  pv:[['scope','cs'],['scopeRef','cs'],['frequency','cs'],['annualBasis','cs'],['occasion','cd'],['amount','in'],['effFrom','cd'],['reason','in']],
  o:[['emp','cs'],['category','cs'],['amount','in'],['effFrom','cd'],['effTo','cd'],['reason','in']],
  t:[['name','in'],['walletType','cs'],['basis','cs'],['amount','in'],['meals','in'],['days','in'],['rule','cs'],['effFrom','cd'],['effTo','cd'],['source','in'],['note','in']],
  g:[['period','cs']],
  rs:[['reason','in']]
};
function wbFid(kind,k){return 'wb'+(kind==='pv'||kind==='g'||kind==='rs'?kind:kind)+'-e-'+k;}
function wbSync(kind,d){
  (WB_FORM[kind]||[]).forEach(function(f){
    const id=wbFid(kind,f[0]);
    if(f[1]==='cs'){if(document.getElementById('csw-'+id))d[f[0]]=getCSValue(id);}
    else{const el=document.getElementById(id);if(el)d[f[0]]=f[1]==='in'?el.value.trim():el.value;}
  });
}
function wbFormKind(){return wbModal?wbModal.kind:(wbEdit?wbEdit.kind:'');}
function wbFormDraft(){return wbModal?wbModal.draft:(wbEdit?wbEdit.draft:null);}
function wbFormHook(){
  const k=wbFormKind(),d=wbFormDraft();if(!d)return;
  const was={scope:d.scope,processing:d.processing};
  wbSync(k,d);
  /* A field that depends on another starts empty when that one changes. */
  if(was.scope!==undefined&&d.scope!==was.scope)d.scopeRef='';
  if(was.processing!==undefined&&d.processing!==was.processing)d.wallet='';
  if(wbModal&&typeof formRepaintParts==='function'&&formRepaintParts(wbModalHTML(),['wb-m-grid']))return;
  renderADTPage();
}
function wbFG(label,inner,o){
  o=o||{};
  return '<div class="ep-form-group'+(o.full?' ep-form-full':'')+(o.dim?' exp-dim':'')+'"><label class="ep-form-label">'+label+(o.req?' <span class="req">*</span>':'')+'</label>'
    +inner+(o.hint?'<div class="ea-hint">'+o.hint+'</div>':'')+'</div>';
}
function wbIn(id,val,ph,type,ro){return '<input class="ep-form-input" id="'+id+'"'+(type?' type="'+type+'"':'')+(type==='number'?' min="0" step="0.01"':'')+(ro?' readonly':'')
  +' value="'+attrSafe(val==null?'':val)+'" placeholder="'+attrSafe(ph||'')+'">';}
function wbMoneyIn(id,val){return '<div class="ax-currency"><span>INR</span>'+wbIn(id,val,'0.00','number')+'</div>';}
function wbTA(id,val,ph){return '<textarea class="ep-form-input ax-notes" id="'+id+'" placeholder="'+attrSafe(ph||'')+'">'+sbEsc(val||'')+'</textarea>';}
function wbRO(val){return '<input class="ep-form-input ca-ro" readonly value="'+attrSafe(val||'')+'">';}
/* inPanel: the panel's Edit form (some fields lock once a record is live). */
function wbFieldsHTML(kind,d,inPanel,rec){
  const F=function(k){return wbFid(kind,k);};
  const live=!!(rec&&rec.status!=='Draft'&&inPanel);
  if(kind==='w'){
    const t=wbType(d.type?(wbTypesHere().find(function(x){return x.name===d.type;})||{}).code:''),nw=!inPanel&&d.type===WB_NEW_TYPE;
    return wbFG('Entity',wbRO(wbEntityName()),{hint:'The entity you are signed in to.'})
      +(inPanel?wbFG('Wallet Type',wbRO(d.type),{req:true,hint:'The type cannot change once created; add a new configuration instead.'})
        :wbFG('Wallet Type',apCS(F('type'),wbTypesHere().filter(function(x){return x.status==='Active';}).map(function(x){return x.name;}).concat([WB_NEW_TYPE]),d.type,'Select Wallet Type','wbFormHook'),{req:true}))
      +(nw?wbFG('New Wallet Type Name',wbIn(F('newName'),d.newName,'e.g. Wellness'),{req:true})
        +wbFG('Wallet Code',wbIn(F('newCode'),d.newCode,'e.g. WELL'),{req:true,hint:'2 to 8 letters or digits.'})
        +wbFG('Classification',apCS(F('newCls'),WB_NEW_CLASSES,d.newCls||'Flexi Benefit','Select'),{req:true,hint:'Flexi Benefit: an employee benefit. Company Expense: company spend.'})
        +wbFG('Wallet Type Description',wbIn(F('newDesc'),d.newDesc,'What the wallet is for'))
      :wbFG('Classification',wbRO(t?t.cls:''),{hint:t&&t.custom?'Created by this company.':'From the platform catalogue.'})
      +wbFG('Funding Source',wbRO(t?t.funding+' · '+t.owner:'')))
      +wbFG('Effective From',(live?wbRO(wbDate(d.effFrom)):apCD(F('effFrom'),d.effFrom,'Select date')),{req:true,hint:live?'Locked once active.':''})
      +wbFG('Effective To',apCD(F('effTo'),d.effTo,'Open-ended'),{hint:'Leave empty for no end date.'})
      +wbFG('Description',wbTA(F('desc'),d.desc,'Remarks'),{full:true})
      +(t?'<div class="ep-form-group ep-form-full"><div class="ea-hint">'+sbEsc(t.desc)+' Benefit policy: '+t.eligible+'.</div></div>':'');
  }
  if(kind==='c'){
    const wf=d.processing==='Wallet-Funded';
    const wallets=wbMine(wbWallets).filter(function(w){const t=wbType(w.type);return t&&t.eligible!=='Not eligible'&&(w.status==='Active'||w.status==='Draft')&&wbShown('w',w)!=='Expired';}).map(wbWalletLabel);
    const expCats=typeof EXP_CATEGORIES!=='undefined'?EXP_CATEGORIES:[];
    return wbFG('Category Name',wbIn(F('name'),d.name,'e.g. Meal Allowance'),{req:true})
      +wbFG('Category Code',live?wbRO(d.code):wbIn(F('code'),d.code,'e.g. MEAL'),{req:true,hint:'Unique in this entity.'+(live?' Locked once active.':'')})
      +(live?wbFG('Processing Type',wbRO(d.processing),{req:true}):wbFG('Processing Type',apCS(F('processing'),WB_PROCESSING,d.processing,'Select Type','wbFormHook'),{req:true,
        hint:d.processing?(wf?'Funded through a wallet as a planned allocation.':'Claimed through Expenses; no wallet needed.'):''}))
      +(live?wbFG('Linked Wallet',wbRO(d.wallet||'Not applicable')):wbFG('Linked Wallet',axCS(F('wallet'),wf?wallets:[],wf?d.wallet:'',wf?'Select Wallet':'Not applicable'),
        {req:wf,dim:!wf,hint:wf?'Only benefit-eligible wallets of this entity.':(d.processing?'Not used for a claim-based category.':'Pick a Processing Type first.')}))
      +wbFG('Linked Expense Category',apCS(F('expCat'),expCats,d.expCat,'None'),{hint:'Optional. Claim-based categories show their entitlement on this expense category\'s form.'})
      +wbFG('Effective From',live?wbRO(wbDate(d.effFrom)):apCD(F('effFrom'),d.effFrom,'Select date'),{req:true})
      +wbFG('Effective To',apCD(F('effTo'),d.effTo,'Open-ended'))
      +(wf?wbFG('Card Spend Evidence',apCS(F('evidence'),WB_EVIDENCE,d.evidence||WB_EVIDENCE[0],'Select','wbFormHook'),{req:true,hint:'What the cardholder provides for each card spend from the linked wallet. Claim-based benefits keep the expense receipt rules.'+(rec&&wbCatEvidenceScheduled(rec).length?' Scheduled: '+wbCatEvidenceScheduled(rec).map(function(x){return x.rule+' from '+wbDate(x.effFrom);}).join('; ')+'.':'')})
        +(rec&&(d.evidence||WB_EVIDENCE[0])!==wbCatEvidenceAt(rec,wbToday()).rule?wbFG('Evidence Rule From',apCD(F('evidenceFrom'),d.evidenceFrom||wbToday(),'Select date'),{req:true,hint:'Today or later; earlier card spends keep their rule.'})
          +wbFG('Reason for the Change',wbIn(F('evidenceReason'),d.evidenceReason,'Kept in the category history'),{req:true}):''):'')
      +wbFG('Description',wbTA(F('desc'),d.desc,'What this benefit covers'),{full:true});
  }
  if(kind==='p'){
    if(live){
      return wbFG('Policy Name',wbIn(F('name'),d.name,''),{req:true,full:true})
        +wbFG('Funding Model',apCS(F('funding'),WB_FUNDING,d.funding,'Select'),{req:true})
        +wbFG('Year-end Rule',apCS(F('yearEnd'),WB_YEAR_END,d.yearEnd,'Select'),{req:true,hint:'Recorded now; applied when wallets are funded.'})
        +wbFG('Description',wbTA(F('desc'),d.desc,''),{full:true})
        +'<div class="ep-form-group ep-form-full"><div class="ea-hint">Amount, scope, frequency and dates are locked on an active policy. Use Versions → New version.</div></div>';
    }
    return wbPolicyMoneyFields('p',d,true);
  }
  if(kind==='pv')return wbPolicyMoneyFields('pv',d,false);
  if(kind==='o'){
    const emps=wbEmployees().map(wbEmpLabel);
    const cats=wbMine(wbCategories).filter(function(c){return c.status==='Active'&&wbShown('c',c)!=='Expired';}).map(wbCatLabel);
    let cur='';
    const e=wbEmpFromLabel(d.emp),c=wbCatByLabel(d.category);
    if(e&&c){const g=wbGeneralFor({eid:e.eid,categoryId:c.id,effFrom:d.effFrom||wbToday()});cur=g?g.p.key+' '+g.p.name+' · '+wbMoney(g.v.amount)+' ('+wbFreqText(g.v)+')':'No general policy applies';}
    return wbFG('Employee',live?wbRO(d.emp):axCS(F('emp'),emps,d.emp,'Search Employee','wbFormHook'),{req:true})
      +wbFG('Benefit Category',live?wbRO(d.category):apCS(F('category'),cats,d.category,'Select Category','wbFormHook'),{req:true})
      +wbFG('Current Policy & Entitlement',wbRO(cur||'Pick an employee and a category'),{full:true,hint:'The override replaces this amount; it is never added to it.'})
      +wbFG('Override Amount',wbMoneyIn(F('amount'),d.amount),{req:true})
      +wbFG('Frequency',wbRO('Taken from the policy it replaces'))
      +wbFG('Effective From',apCD(F('effFrom'),d.effFrom,'Select date'),{req:true})
      +wbFG('Effective To',apCD(F('effTo'),d.effTo,'Open-ended'))
      +wbFG('Reason',wbTA(F('reason'),d.reason,'Why this employee is an exception'),{req:true,full:true});
  }
  if(kind==='t'){
    const perMeal=d.basis==='Per meal';
    const ref=perMeal?(Number(d.amount)||0)*(Number(d.meals)||0)*(Number(d.days)||0):0;
    return wbFG('Threshold Name',wbIn(F('name'),d.name,'e.g. Meal vouchers - tax-free per meal'),{req:true,full:true})
      +wbFG('Wallet',apCS(F('walletType'),wbTypesHere().filter(function(t){return t.eligible!=='Not eligible';}).map(function(t){return t.name;}),d.walletType,'Select Wallet'),{req:true})
      +wbFG('Basis',apCS(F('basis'),WB_TAX_BASIS,d.basis,'Select Basis','wbFormHook'),{req:true})
      +wbFG('Amount',wbMoneyIn(F('amount'),d.amount),{req:true,hint:perMeal?'Per meal.':''})
      +wbFG('Rule',apCS(F('rule'),WB_TAX_RULE,d.rule,'Select Rule'),{req:true,hint:'Below = the limit itself is already over (e.g. gifts below 15,000).'})
      +wbFG('Meals per Working Day',wbIn(F('meals'),d.meals,'2','number'),{dim:!perMeal,req:perMeal,hint:perMeal?'':'Only for a per-meal basis.'})
      +wbFG('Working Days per Month',wbIn(F('days'),d.days,'22','number'),{dim:!perMeal,req:perMeal,hint:perMeal&&ref?'Monthly reference: '+wbMoney(ref)+'.':''})
      +wbFG('Effective From',apCD(F('effFrom'),d.effFrom,'Select date'),{req:true})
      +wbFG('Effective To',apCD(F('effTo'),d.effTo,'Open-ended'))
      +wbFG('Source',wbIn(F('source'),d.source,'e.g. Income-tax Rules 2026, Rule 15'),{req:true,full:true})
      +wbFG('Note',wbTA(F('note'),d.note,''),{full:true});
  }
  if(kind==='g'){
    const per=wbPeriods().find(function(x){return wbPeriodLabel(x)===d.period;})||wbCurPeriod();
    const live=wbMine(wbBatches).find(function(b){return b.period===per&&WB_LIVE_BATCH.indexOf(b.status)>=0;});
    const built=wbBuild(per);
    const total=built.rows.reduce(function(s,r){return s+r.amount;},0);
    const byW={};built.rows.forEach(function(r){const k=r.wallet?wbTypeName(r.wallet.type):'Claim-Based';byW[k]=(byW[k]||0)+r.amount;});
    return wbFG('Period',apCS(F('period'),wbPeriods().map(wbPeriodLabel),d.period,'Select Period','wbFormHook'),{req:true,hint:'Monthly policies, annual policies whose year starts this month, and one-time policies whose occasion falls in it.'})
      +'<div class="ep-form-group ep-form-full">'
      +(live?'<div class="wb-note is-bad"><b>'+live.key+' is '+live.status+' for '+wbPeriodLabel(per)+'.</b> '
          +(live.status==='Approved'?'Open it and use "Create replacement batch" to change an approved period.':'Open it and recalculate instead of generating again.')+'</div>':'')
      +'<div class="wb-proj-cards"><div class="wb-proj-card"><span>Will be generated</span><b>'+wbMoney(total)+'</b><em>'+built.rows.length+' allocations</em></div>'
      +'<div class="wb-proj-card"><span>Left out</span><b>'+built.exc.length+'</b><em>see the list below</em></div></div>'
      +(Object.keys(byW).length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><tbody>'+Object.keys(byW).map(function(k){return '<tr><td class="csag-td">'+sbEsc(k)+'</td><td class="csag-td wb-num">'+wbMoney(byW[k])+'</td></tr>';}).join('')+'</tbody></table></div>':'')
      +(built.rows.length?'<div class="wb-proj-h">Preview</div><div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Employee</th><th>Category</th><th>Source</th><th>Amount</th></tr></thead><tbody>'
        +built.rows.map(function(r){return '<tr><td class="csag-td">'+sbEsc(r.emp.name)+'<div class="wb-muted">'+r.emp.empId+'</div></td><td class="csag-td">'+sbEsc(r.cat.name)+'</td><td class="csag-td">'+sbEsc(wbSourceText(r))+'</td><td class="csag-td">'+wbMoney(r.amount)+'</td></tr>';}).join('')
        +'</tbody></table></div>':'')
      +(built.exc.length?'<div class="wb-proj-h">Left out</div><div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Employee</th><th>Category</th><th>Why</th></tr></thead><tbody>'
        +built.exc.map(function(x){return '<tr><td class="csag-td">'+sbEsc(x.r.emp.name)+'</td><td class="csag-td">'+sbEsc(x.r.cat.name)+'</td><td class="csag-td">'+sbEsc(x.why)+'</td></tr>';}).join('')
        +'</tbody></table></div>':'')
      +'<div class="wb-note">Creates planned records only; no money moves.</div>'
      +'</div>';
  }
  if(kind==='rs'){
    return wbFG('Reason',wbTA(F('reason'),d.reason,'Why'),{req:true,full:true,hint:d.hint||''});
  }
  return '';
}
/* The money half of a policy: shared by the policy form and New version. */
function wbPolicyMoneyFields(kind,d,withHead){
  const F=function(k){return wbFid(kind,k);};
  const cats=wbMine(wbCategories).filter(function(c){return c.status!=='Inactive'&&wbShown('c',c)!=='Expired';}).map(wbCatLabel);
  const c=kind==='pv'?wbRec('c',d.categoryId):wbCatByLabel(d.category);
  const refOpts=d.scope==='Branch'?(typeof wbBranches==='function'?wbBranches():[]):d.scope==='Department'?wbDepts():d.scope==='Designation'?wbDesigs():d.scope==='Employee'?wbEmployees().map(wbEmpLabel):[];
  const refOn=!!d.scope&&d.scope!=='Entity';
  const v={amount:d.amount,frequency:d.frequency,occasion:d.occasion,effFrom:d.effFrom};
  const adv=c?wbPolicyTaxFlags(c.id,v):[];
  let reach='';
  if(d.scope&&c){
    const vv={scope:d.scope,scopeRef:d.scope==='Employee'?((wbEmpFromLabel(d.scopeRef)||{}).eid||''):d.scopeRef};
    const n=wbEmployees().filter(function(e){return wbScopeHit(vv,e);}).length;
    reach=n+' employee'+(n===1?'':'s')+' in scope'+(Number(d.amount)>0?' · up to '+wbMoney(n*Number(d.amount))+(d.frequency==='Monthly'?' a month':d.frequency==='Annual'?' a year':' once'):'');
  }
  return (withHead?wbFG('Policy Name',wbIn(F('name'),d.name,'e.g. Sales meal'),{req:true,full:true})
      +wbFG('Benefit Category',apCS(F('category'),cats,d.category,'Select Category','wbFormHook'),{req:true,hint:c?c.processing+(wbWalletOf(c)?' · '+wbTypeName(wbWalletOf(c).type)+' wallet':''):''}):'')
    +wbFG('Applies To',apCS(F('scope'),WB_SCOPES,d.scope,'Select Level','wbFormHook'),{req:true,hint:'Priority: Employee › Designation › Department › Branch › Entity. Overrides beat all.'})
    +wbFG(d.scope==='Employee'?'Employee':d.scope==='Designation'?'Designation':d.scope==='Department'?'Department':d.scope==='Branch'?'Branch':'Scope',
      refOn?axCS(F('scopeRef'),refOpts,d.scopeRef,'Search '+d.scope,'wbFormHook'):wbRO(d.scope==='Entity'?'Everyone in '+wbEntityName():''),
      {req:refOn,dim:!refOn,hint:refOn?(reach||''):(d.scope==='Entity'?reach:'Pick a level first.')})
    +wbFG('Entitlement Frequency',apCS(F('frequency'),WB_FREQS,d.frequency,'Select Frequency','wbFormHook'),{req:true,
      hint:d.frequency==='Annual'?'Allocated once, in the first month of the year, to those eligible on its 15th.':d.frequency==='One-time'?'Allocated in the occasion month to those eligible on the occasion date.':'No proration: eligibility by the 15th-of-month rule.'})
    +wbFG('Annual Period Basis',apCS(F('annualBasis'),WB_ANNUAL_BASIS,d.annualBasis,'Select Basis'),{req:d.frequency==='Annual',dim:d.frequency!=='Annual',hint:d.frequency==='Annual'?'':'Only for an annual policy.'})
    +wbFG('Occasion Date',apCD(F('occasion'),d.occasion,'Select date'),{req:d.frequency==='One-time',dim:d.frequency!=='One-time',hint:d.frequency==='One-time'?'e.g. Diwali.':'Only for a one-time policy.'})
    +wbFG('Entitlement Amount',wbMoneyIn(F('amount'),d.amount)+wbAdvisoryHTML(adv),{req:true})
    +wbFG('Currency',wbRO('INR'),{hint:'Entity currency.'})
    +wbFG('Effective From',apCD(F('effFrom'),d.effFrom,'Select date'),{req:true,hint:kind==='pv'?'Must be after the current version starts. The current version ends the day before.':''})
    +(kind==='pv'?wbFG('Reason for the change',wbTA(F('reason'),d.reason,'Why the amount or scope changes'),{req:true,full:true})
      :wbFG('Effective To',apCD(F('effTo'),d.effTo,'Open-ended'))
        +wbFG('Funding Model',apCS(F('funding'),WB_FUNDING,d.funding,'Select'),{req:true,hint:'Recorded for payroll; no payroll change is made here.'})
        +wbFG('Year-end Rule',apCS(F('yearEnd'),WB_YEAR_END,d.yearEnd,'Select'),{req:true,hint:'What happens to unused benefit at year end, once wallets are funded.'})
        +wbFG('Description',wbTA(F('desc'),d.desc,''),{full:true}));
}

/* ── + Add (one popup per tab) ────────────────────────────────────────── */
const WB_ADD_PERM={w:'benefit.wallet.manage',c:'benefit.category.manage',p:'benefit.policy.manage',o:'benefit.override.manage',t:'benefit.tax.manage'};
function wbStartAdd(){
  if(page!=='wallet-benefits')navigatePage('wallet-benefits');
  const k=wbKindOfTab(wbTab);
  if(k==='e'||k==='a'){wbStartGenerate();return;}
  if(!wbCan(WB_ADD_PERM[k])){wbDeny('add a '+WB_KIND_NAME[k]);return;}
  wbDropEdit();
  const today=wbToday();
  const D={
    w:{type:'',effFrom:today,effTo:'',desc:''},
    c:{name:'',code:'',processing:'',wallet:'',expCat:'',effFrom:today,effTo:'',desc:''},
    p:{name:'',category:'',scope:'',scopeRef:'',frequency:'Monthly',annualBasis:WB_ANNUAL_BASIS[0],occasion:'',amount:'',effFrom:today,effTo:'',
       funding:WB_FUNDING[0],yearEnd:WB_YEAR_END[0],desc:''},
    o:{emp:'',category:'',amount:'',effFrom:today,effTo:'',reason:''},
    t:{name:'',walletType:'',basis:'',amount:'',meals:'2',days:'22',rule:WB_TAX_RULE[0],effFrom:today,effTo:'',source:'',note:''}
  }[k];
  wbModal={kind:k,draft:D};renderADTPage();
}
function wbStartOverride(eid,catId){
  if(!wbCan('benefit.override.manage')){wbDeny('add an override');return;}
  const e=wbEmpById(eid),c=wbRec('c',catId);
  wbModal={kind:'o',draft:{emp:e?wbEmpLabel(e):'',category:c?wbCatLabel(c):'',amount:'',effFrom:wbCurPeriod()+'-01',effTo:'',reason:''}};
  renderADTPage();
}
function wbStartVersion(id){
  const p=wbRec('p',id);if(!p)return;
  if(!wbCan('benefit.policy.manage')){wbDeny('version a policy');return;}
  const v=wbCurV(p);
  wbModal={kind:'pv',id:id,draft:{categoryId:p.categoryId,scope:v.scope,scopeRef:v.scope==='Employee'?(function(){const e=wbEmpById(v.scopeRef);return e?wbEmpLabel(e):v.scopeRef;})():v.scopeRef,
    frequency:v.frequency,annualBasis:v.annualBasis||WB_ANNUAL_BASIS[0],occasion:v.occasion,amount:String(v.amount),
    effFrom:wbAddDays(wbToday(),1),reason:''}};
  renderADTPage();
}
function wbStartGenerate(){
  if(!wbCan('benefit.allocation.generate')){wbDeny('generate allocations');return;}
  wbModal={kind:'g',draft:{period:wbPeriodLabel(wbCurPeriod())}};renderADTPage();
}
function wbStartRecalc(id){wbModal={kind:'rs',action:'recalc',id:id,draft:{reason:'',hint:'Rows are worked out again from today\'s policies and people. Old rows stay in history as Superseded.'}};renderADTPage();}
function wbStartReplace(id){wbModal={kind:'rs',action:'replace',id:id,draft:{reason:'',hint:'The approved batch stays in force until the replacement is approved; then it becomes Superseded.'}};renderADTPage();}
function wbStartCancelRow(bid,rid){wbModal={kind:'rs',action:'cancelRow',id:bid,rowId:rid,draft:{reason:'',hint:'The allocation is kept as Cancelled with this reason.'}};renderADTPage();}
function wbCancelModal(){wbModal=null;renderADTPage();}
function wbModalHTML(){
  const m=wbModal,k=m.kind;
  const T={w:['Add Wallet Configuration','Configure a wallet for this entity, from the platform catalogue or a new wallet type. Nothing is created at the bank.'],
    c:['Add Benefit Category','A benefit is either funded through a wallet or claimed through Expenses.'],
    p:['Add Benefit Policy','Who gets how much, how often, from when. Saved as a draft until you activate it.'],
    pv:['New Policy Version','Change amount, scope or frequency from a future date. The current version is end-dated, and history stays.'],
    o:['Add Employee Override','One person\'s exception. It replaces the general entitlement and is never added to it.'],
    t:['Add Tax Threshold','An advisory reference. It counts only after Finance approves it.'],
    g:['Generate Planned Allocations','Preview what the period comes to, then create a Planned batch for approval.'],
    rs:[{recalc:'Recalculate Batch',replace:'Create Replacement Batch',cancelRow:'Cancel Allocation'}[m.action]||'Reason','']}[k];
  let btns='';
  if(k==='w'||k==='c'||k==='p')btns='<button class="ep-cancel-btn" onclick="wbSubmitAdd(false)">Save as Draft</button><button class="ep-save-btn" onclick="wbSubmitAdd(true)">Save & Activate</button>';
  else if(k==='t')btns='<button class="ep-cancel-btn" onclick="wbSubmitAdd(false)">Save as Draft</button><button class="ep-save-btn" onclick="wbSubmitAdd(true)">Submit for Finance approval</button>';
  else if(k==='o')btns='<button class="ep-save-btn" onclick="wbSubmitAdd(true)">Save Override</button>';
  else if(k==='pv')btns='<button class="ep-save-btn" onclick="wbSubmitVersion()">Create Version</button>';
  else if(k==='g'){const gs=wbGenState();btns='<button class="ep-save-btn" onclick="wbSubmitGenerate()"'+(gs.blocked?' disabled title="'+attrSafe(gs.why)+'"':'')+'>Generate Planned Batch</button>';}
  else btns='<button class="ep-save-btn" onclick="wbSubmitReason()">Confirm</button>';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form ax-modal'+(k==='g'?' wb-modal-wide':'')+'" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+T[0]+'</span><button class="ct-modal-close" onclick="wbCancelModal()">'+AX_ICO.x+'</button></div>'
    +(T[1]?'<p class="ct-modal-sub">'+T[1]+' Fields marked <span class="req">*</span> are required.</p>':'')
    +'<div class="ep-form-grid" id="wb-m-grid">'+wbFieldsHTML(k,m.draft,false)+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="wbCancelModal()">Cancel</button>'+btns+'</div></div>'
    +'</div></div>';
}
function wbNeed(d,list){
  for(let i=0;i<list.length;i++){if(!String(d[list[i][0]]==null?'':d[list[i][0]]).trim()){showToast(list[i][1]+' is required','error');return false;}}
  return true;
}
/* Build a record from a form draft (shared by + Add and panel Edit). */
function wbFromDraft(kind,d,rec){
  if(kind==='w'){
    const t=wbTypesHere().find(function(x){return x.name===d.type;});
    return {type:t?t.code:(rec?rec.type:''),effFrom:d.effFrom,effTo:d.effTo||'',desc:d.desc||''};
  }
  if(kind==='c'){
    const w=d.processing==='Wallet-Funded'?wbWalletByLabel(d.wallet):null;
    const x={name:d.name,code:String(d.code||'').toUpperCase(),processing:d.processing,walletId:w?w.id:(rec&&d.processing==='Wallet-Funded'?rec.walletId:null),
      expCat:d.expCat||'',effFrom:d.effFrom,effTo:d.effTo||'',desc:d.desc||''};
    /* A new Wallet-Funded category starts with the evidence rule chosen on the form, from its own Effective From. */
    if(!rec&&d.processing==='Wallet-Funded'&&d.evidence&&d.evidence!==WB_EVIDENCE[0]){const s=stampNow();x.evidenceRules=[{v:1,rule:d.evidence,effFrom:d.effFrom,reason:'Set when the category was created',source:'Wallet & Benefits',by:wbActor(),byId:wbActorId(),actual:'',at:s.date+' | '+s.time,migratedFrom:null}];}
    return x;
  }
  if(kind==='o'){const e=wbEmpFromLabel(d.emp),c=wbCatByLabel(d.category);
    return {eid:e?e.eid:(rec?rec.eid:''),categoryId:c?c.id:(rec?rec.categoryId:null),amount:parseFloat(d.amount),effFrom:d.effFrom,effTo:d.effTo||'',reason:d.reason};}
  if(kind==='t'){const t=wbTypesHere().find(function(x){return x.name===d.walletType;});
    return {name:d.name,walletType:t?t.code:'',basis:d.basis,amount:parseFloat(d.amount),meals:d.basis==='Per meal'?Number(d.meals):0,days:d.basis==='Per meal'?Number(d.days):0,
      rule:d.rule,effFrom:d.effFrom,effTo:d.effTo||'',source:d.source,note:d.note||''};}
  return null;
}
function wbVersionFromDraft(d,n){
  return wbV(n,parseFloat(d.amount),d.frequency,d.scope,d.scope==='Employee'?((wbEmpFromLabel(d.scopeRef)||{}).eid||''):(d.scope==='Entity'?'':d.scopeRef),d.effFrom,d.effTo||'',
    {annualBasis:d.frequency==='Annual'?d.annualBasis:'',occasion:d.frequency==='One-time'?d.occasion:''});
}
function wbCheckDraft(kind,d,rec){
  if(kind==='w'){
    if(!wbNeed(d,[['type','Wallet Type'],['effFrom','Effective From']]))return false;
    if(d.type===WB_NEW_TYPE){const e=wbNewTypeCheck(d);if(e){showToast(e,'error');return false;}if(d.effTo&&d.effTo<d.effFrom){showToast('Effective To cannot be before Effective From','error');return false;}return true;}
    if(d.effTo&&d.effTo<d.effFrom){showToast('Effective To cannot be before Effective From','error');return false;}
    const x=Object.assign({},rec||{},wbFromDraft('w',d,rec),{entity:wbEntity(),status:rec?rec.status:'Draft'});
    const twin=wbWalletTwin(rec?Object.assign(x,{id:rec.id}):x);
    if(twin&&twin!==rec){showToast('Overlapping configuration','error',twin.key+' already covers '+wbTypeName(x.type)+' for these dates.');return false;}
    return true;
  }
  if(kind==='c'){
    if(!wbNeed(d,[['name','Category Name'],['code','Category Code'],['processing','Processing Type'],['effFrom','Effective From']]))return false;
    if(d.processing==='Wallet-Funded'&&!wbWalletByLabel(d.wallet)&&!(rec&&rec.walletId)){showToast('Linked Wallet is required for a wallet-funded category','error');return false;}
    if(d.effTo&&d.effTo<d.effFrom){showToast('Effective To cannot be before Effective From','error');return false;}
    const dup=wbMine(wbCategories).find(function(x){return x!==rec&&(x.code.toLowerCase()===String(d.code).toLowerCase()||x.name.toLowerCase()===String(d.name).toLowerCase());});
    if(dup){showToast('Name or code already used','error',dup.key+' · '+dup.name);return false;}
    if(rec&&d.processing==='Wallet-Funded'&&d.evidence&&d.evidence!==wbCatEvidenceAt(rec,wbToday()).rule){const e=wbCatEvidenceCheck(Object.assign({},rec,{processing:'Wallet-Funded'}),d.evidence,d.evidenceFrom||wbToday(),d.evidenceReason);if(e){showToast('Card spend evidence not saved','error',e);return false;}}
    return true;
  }
  if(kind==='p'){
    if(rec&&rec.status!=='Draft')return wbNeed(d,[['name','Policy Name'],['funding','Funding Model'],['yearEnd','Year-end Rule']]);
    if(!wbNeed(d,[['name','Policy Name'],['category','Benefit Category'],['scope','Applies To'],['frequency','Entitlement Frequency'],['amount','Entitlement Amount'],
      ['effFrom','Effective From'],['funding','Funding Model'],['yearEnd','Year-end Rule']]))return false;
    if(d.scope!=='Entity'&&!String(d.scopeRef||'').trim()){showToast(d.scope+' is required','error');return false;}
    const c=wbCatByLabel(d.category);if(!c){showToast('Benefit Category is required','error');return false;}
    return wbVersionCheck(wbVersionFromDraft(d,1),c);
  }
  if(kind==='o'){
    if(!wbNeed(d,[['emp','Employee'],['category','Benefit Category'],['amount','Override Amount'],['effFrom','Effective From'],['reason','Reason']]))return false;
    if(!(parseFloat(d.amount)>0)){showToast('Override Amount must be more than 0','error');return false;}
    if(d.effTo&&d.effTo<d.effFrom){showToast('Effective To cannot be before Effective From','error');return false;}
    const x=wbFromDraft('o',d,rec);x.id=rec?rec.id:-1;x.status='Active';
    const twin=wbOverrideTwin(Object.assign({entity:wbEntity()},x));
    if(twin){showToast('Overlapping override','error',twin.key+' already covers this employee and category for these dates.');return false;}
    return true;
  }
  if(kind==='t'){
    const need=[['name','Threshold Name'],['walletType','Wallet'],['basis','Basis'],['amount','Amount'],['rule','Rule'],['effFrom','Effective From'],['source','Source']];
    if(d.basis==='Per meal')need.push(['meals','Meals per Working Day'],['days','Working Days per Month']);
    if(!wbNeed(d,need))return false;
    if(!(parseFloat(d.amount)>0)){showToast('Amount must be more than 0','error');return false;}
    if(d.effTo&&d.effTo<d.effFrom){showToast('Effective To cannot be before Effective From','error');return false;}
    return true;
  }
  return true;
}
function wbSubmitAdd(activate){
  const m=wbModal;if(!m)return;
  const k=m.kind,d=m.draft;
  wbSync(k,d);
  if(!wbCheckDraft(k,d,null))return;
  /* A new wallet type is created with its first wallet configuration (this company only). */
  let newType=null;if(k==='w'&&d.type===WB_NEW_TYPE){newType=wbNewTypeCreate(d);d.type=newType.name;}
  const s=stampNow(),at=s.date+' | '+s.time;
  const n=wbNext[k]++;
  const keys={w:'WC-'+(1000+n),c:'BC-'+String(d.code||'').toUpperCase(),p:'BP-'+(2000+n),o:'BO-'+(3000+n),t:'TT-'+(4000+n)};
  let r;
  if(k==='p'){
    const c=wbCatByLabel(d.category);
    r={id:n,key:keys.p,entity:wbEntity(),name:d.name,categoryId:c.id,status:'Draft',versions:[wbVersionFromDraft(d,1)],funding:d.funding,yearEnd:d.yearEnd,desc:d.desc||'',
      createdBy:wbActor(),createdById:wbActorId(),createdAt:at};
    wbPSync(r);
  }else{
    r=Object.assign({id:n,key:keys[k],entity:wbEntity(),status:k==='o'?'Active':'Draft',createdBy:wbActor(),createdById:wbActorId(),createdAt:at},wbFromDraft(k,d,null));
    if(k==='o')r.activatedOn=wbToday();
  }
  r.logs=[wbLog(s.date,s.time,wbActor(),k==='o'?'Active':'Draft',k==='o'?'Override created: '+wbMoney(r.amount)+'. Reason: '+r.reason:'Created as draft.'+(newType?' New wallet type '+newType.name+' ('+newType.code+', '+newType.cls+') created for '+wbEntityName()+'.':''))];
  if(activate&&(k==='w'||k==='c'||k==='p')){
    const store=WB_STORE[k]();store.unshift(r);
    const note=wbGuard(k,r,'Active');
    if(note===false){wbModal=null;lpLanded('wb-'+k,r.id);renderADTPage();showToast('Saved as draft','info',r.key+' could not be activated yet - see the message above.');return;}
    wbApply(k,r,'Active');
    r.logs.unshift(wbLog(s.date,s.time,wbActor(),wbShown(k,r),'Activated on creation.'));
  }else if(k==='t'&&activate){
    r.status='Pending Approval';r.submittedBy=wbActor();r.submittedById=wbActorId();
    r.logs.unshift(wbLog(s.date,s.time,wbActor(),'Pending Approval','Submitted for Finance approval.'));
    WB_STORE[k]().unshift(r);
  }else WB_STORE[k]().unshift(r);
  lpLanded('wb-'+k,r.id);
  wbModal=null;renderADTPage();
  showToast(WB_KIND_NAME[k].charAt(0).toUpperCase()+WB_KIND_NAME[k].slice(1)+' saved','success',r.key+' is '+wbShown(k,r)+'.');
}
function wbSubmitVersion(){
  const m=wbModal;if(!m||m.kind!=='pv')return;
  const p=wbRec('p',m.id);if(!p)return;
  const d=m.draft;wbSync('pv',d);
  if(!wbNeed(d,[['scope','Applies To'],['frequency','Entitlement Frequency'],['amount','Entitlement Amount'],['effFrom','Effective From'],['reason','Reason for the change']]))return;
  if(d.scope!=='Entity'&&!String(d.scopeRef||'').trim()){showToast(d.scope+' is required','error');return;}
  const cur=wbCurV(p),last=p.versions[p.versions.length-1];
  if(d.effFrom<=cur.effFrom||d.effFrom<=last.effFrom){showToast('Effective From must be after the current version starts','error','The latest version starts '+wbDate(last.effFrom)+'.');return;}
  if(d.effFrom<=wbToday()){showToast('A new version must start in the future','error','Allocations already generated keep the version they were made from.');return;}
  const nv=wbVersionFromDraft(d,last.v+1);
  nv.effTo=last.effTo&&last.effTo>=d.effFrom?last.effTo:'';
  nv.by=wbActor();nv.byId=wbActorId();const s=stampNow();nv.at=s.date;nv.reason=d.reason;
  const c=wbRec('c',p.categoryId);
  if(!wbVersionCheck(nv,c))return;
  const conf=wbPolicyConflicts(p,[nv]);
  if(conf.length){showToast('Policy conflict','error',wbList(conf,function(x){return x.p.key+' '+x.p.name;})+'.');return;}
  const before=wbMoney(last.amount)+' '+last.scope;
  last.effTo=wbAddDays(d.effFrom,-1);
  p.versions.push(nv);wbPSync(p);
  wbSeedLogs('p',p);
  p.logs.unshift(wbLog(s.date,s.time,wbActor(),wbShown('p',p),'Version '+nv.v+' from '+wbDate(nv.effFrom)+': '+before+' → '+wbMoney(nv.amount)+' '+nv.scope+'. Reason: '+d.reason));
  wbModal=null;wbPTab.p='versions';renderADTPage();
  showToast('Version '+nv.v+' created','success',p.key+' changes on '+wbDate(nv.effFrom)+'.');
}
function wbSubmitGenerate(){
  const m=wbModal;if(!m)return;wbSync('g',m.draft);
  const per=wbPeriods().find(function(x){return wbPeriodLabel(x)===m.draft.period;});
  if(!per){showToast('Period is required','error');return;}
  const live=wbMine(wbBatches).find(function(b){return b.period===per&&WB_LIVE_BATCH.indexOf(b.status)>=0;});
  if(live){showToast('Batch already exists','error',live.key+' is '+live.status+' for '+wbPeriodLabel(per)+'.');return;}
  const built=wbBuild(per);
  if(!built.rows.length){showToast('Nothing to generate','error','No eligible, unallocated entitlement is due in '+wbPeriodLabel(per)+'.');return;}
  const b=wbMakeBatch(per,built);
  wbModal=null;wbTab='allocations';wbSel.a=b.id;wbPTab.a='basic-details';lpLanded('wb-a',b.id);renderADTPage();
  showToast('Planned batch generated','success',b.key+' · '+b.rows.length+' allocations · '+wbMoney(wbBatchTotal(b))+'. Submit it for approval next.');
}
function wbSubmitReason(){
  const m=wbModal;if(!m)return;wbSync('rs',m.draft);
  const reason=String(m.draft.reason||'').trim();
  if(!reason){showToast('Reason is required','error');return;}
  const b=wbRec('a',m.id);if(!b)return;
  if(!wbCan('benefit.allocation.generate')){wbDeny('change an allocation batch');return;}
  const s=stampNow();wbSeedLogs('a',b);
  if(m.action==='cancelRow'){
    const x=b.rows.find(function(y){return y.id===m.rowId;});
    if(x&&x.status==='Planned'){x.status='Cancelled';x.cancelReason=reason;
      b.logs.unshift(wbLog(s.date,s.time,wbActor(),b.status,'Cancelled '+x.key+' ('+x.empName+', '+x.categoryName+', '+wbMoney(x.amount)+'). Reason: '+reason));}
    wbModal=null;renderADTPage();showToast('Allocation cancelled','success',x?x.key:'');return;
  }
  if(m.action==='recalc'){
    const before={n:wbBatchLive(b).length,t:wbBatchTotal(b)};
    const old=wbBatchLive(b);
    const built=wbBuild(b.period,[b.id,b.replaces]);
    old.forEach(function(x){x.status='Superseded';});
    built.rows.forEach(function(r){
      const prev=old.find(function(x){return x.eid===r.emp.eid&&x.categoryId===r.cat.id;});
      b.rows.push(wbAllocRow(b,r,prev));
    });
    b.exceptions=built.exc.map(function(e){return {empId:e.r.emp.empId,name:e.r.emp.name,cat:e.r.cat.name,why:e.why};});
    b.recalcs.push({at:s.date+' | '+s.time,by:wbActor(),byId:wbActorId(),reason:reason,before:before,after:{n:wbBatchLive(b).length,t:wbBatchTotal(b)}});
    b.logs.unshift(wbLog(s.date,s.time,wbActor(),b.status,'Recalculated: '+before.n+' → '+wbBatchLive(b).length+' allocations, '+wbMoney(before.t)+' → '+wbMoney(wbBatchTotal(b))+'. Reason: '+reason));
    if(b.status==='Rejected')b.status='Planned';
    wbModal=null;wbPTab.a='rows';renderADTPage();showToast('Batch recalculated','success',b.key+' · '+wbBatchLive(b).length+' allocations.');return;
  }
  if(m.action==='replace'){
    if(b.status!=='Approved')return;
    const built=wbBuild(b.period,b.id);
    if(!built.rows.length){showToast('Nothing to generate','error');return;}
    const nb=wbMakeBatch(b.period,built,{replaces:b.id,reason:reason});
    b.logs.unshift(wbLog(s.date,s.time,wbActor(),b.status,'Replacement '+nb.key+' generated. Reason: '+reason));
    wbModal=null;wbSel.a=nb.id;lpLanded('wb-a',nb.id);renderADTPage();showToast('Replacement batch generated','success',nb.key+' replaces '+b.key+' once approved.');
  }
}

/* ── Panel Edit ───────────────────────────────────────────────────────── */
function wbStartEdit(kind){
  const r=wbRec(kind,wbSel[kind]);if(!r)return;
  const perm={w:'benefit.wallet.manage',c:'benefit.category.manage',p:'benefit.policy.manage',o:'benefit.override.manage',t:'benefit.tax.manage'}[kind];
  if(!wbCan(perm)){wbDeny('edit a '+WB_KIND_NAME[kind]);return;}
  let d;
  if(kind==='w')d={type:wbTypeName(r.type),effFrom:r.effFrom,effTo:r.effTo,desc:r.desc};
  if(kind==='c'){const w=wbWalletOf(r);d={name:r.name,code:r.code,processing:r.processing,wallet:w?wbWalletLabel(w):'',expCat:r.expCat,effFrom:r.effFrom,effTo:r.effTo,desc:r.desc,evidence:wbCatEvidenceAt(r,wbToday()).rule,evidenceFrom:'',evidenceReason:''};}
  if(kind==='p'){const v=r.versions[0],c=wbRec('c',r.categoryId);
    d={name:r.name,category:c?wbCatLabel(c):'',scope:v.scope,scopeRef:v.scope==='Employee'?(function(){const e=wbEmpById(v.scopeRef);return e?wbEmpLabel(e):v.scopeRef;})():v.scopeRef,
      frequency:v.frequency,annualBasis:v.annualBasis||WB_ANNUAL_BASIS[0],occasion:v.occasion,amount:String(v.amount),effFrom:v.effFrom,effTo:v.effTo,
      funding:r.funding,yearEnd:r.yearEnd,desc:r.desc};}
  if(kind==='o'){const e=wbEmpById(r.eid),c=wbRec('c',r.categoryId);d={emp:e?wbEmpLabel(e):'',category:c?wbCatLabel(c):'',amount:String(r.amount),effFrom:r.effFrom,effTo:r.effTo,reason:r.reason};}
  if(kind==='t')d={name:r.name,walletType:wbTypeName(r.walletType),basis:r.basis,amount:String(r.amount),meals:String(r.meals||''),days:String(r.days||''),rule:r.rule,
    effFrom:r.effFrom,effTo:r.effTo,source:r.source,note:r.note};
  wbEdit={kind:kind,id:r.id,draft:d,orig:JSON.stringify(d)};wbPTab[kind]='basic-details';
  renderADTPage();
}
function wbCancelEdit(){wbDropEdit();renderADTPage();}
function wbSaveEdit(){
  if(!wbEdit)return;
  const kind=wbEdit.kind,r=wbRec(kind,wbEdit.id),d=wbEdit.draft;if(!r)return;
  wbSync(kind,d);
  if(!wbCheckDraft(kind,d,r))return;
  if(kind==='p'){
    if(r.status==='Draft'){
      const c=wbCatByLabel(d.category);
      Object.assign(r,{name:d.name,categoryId:c?c.id:r.categoryId,funding:d.funding,yearEnd:d.yearEnd,desc:d.desc||''});
      r.versions=[wbVersionFromDraft(d,1)];wbPSync(r);
    }else Object.assign(r,{name:d.name,funding:d.funding,yearEnd:d.yearEnd,desc:d.desc||''});
  }else if(kind==='w'){
    const x=wbFromDraft('w',d,r);
    if(r.status!=='Draft')x.effFrom=r.effFrom;
    Object.assign(r,{effFrom:x.effFrom,effTo:x.effTo,desc:x.desc});
  }else if(kind==='c'){
    const x=wbFromDraft('c',d,r);
    if(r.status!=='Draft'){x.code=r.code;x.processing=r.processing;x.walletId=r.walletId;x.effFrom=r.effFrom;}
    Object.assign(r,x);
    if(r.processing==='Wallet-Funded'&&d.evidence&&d.evidence!==wbCatEvidenceAt(r,wbToday()).rule&&d.evidence!==wbCatEvidenceAt(r,d.evidenceFrom||wbToday()).rule){const st=stampNow();wbCatEvidencePush(r,{rule:d.evidence,effFrom:d.evidenceFrom||wbToday(),reason:String(d.evidenceReason||'').trim(),by:wbActor(),byId:wbActorId(),
      actual:typeof idSwitched==='function'&&idSwitched()&&typeof idAuthMe==='function'?idAuthMe():'',at:st.date+' | '+st.time});}
  }else Object.assign(r,wbFromDraft(kind,d,r));
  const s=stampNow();wbSeedLogs(kind,r);
  if(kind==='o')r.logs.unshift(wbLog(s.date,s.time,wbActor(),wbShown('o',r),'Override updated to '+wbMoney(r.amount)+'. Reason: '+r.reason));
  wbDropEdit();renderADTPage();
  showToast('Saved','success',r.key+' updated.');
}

/* ── Exports ──────────────────────────────────────────────────────────── */
function wbCSV(name,head,rows){
  const q=function(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const csv=[head].concat(rows).map(function(r){return r.map(q).join(',');}).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name+'-'+wbToday()+'.csv';document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},0);
}
function wbExportEntitlements(){
  if(!wbCan('benefit.entitlement.export')){wbDeny('export entitlements');return;}
  const per=wbCurPeriod(),rows=wbEntRows(per);
  if(!rows.length){showToast('Nothing to export','info');return;}
  wbCSV('entitlements-'+per,['Employee ID','Employee Name','Department','Designation','Benefit Category','Linked Wallet','Source','Frequency','Entitlement Amount','Due This Period',
    'Applicable Period','Eligibility','Reason','Allocation Status','Tax Advisory'],
    rows.map(function(r){return [r.emp.empId,r.emp.name,r.emp.dept,r.emp.desig,r.cat.name,r.wallet?wbTypeName(r.wallet.type):'Claim-Based',wbSourceText(r),r.freq,
      r.conflict?'':r.amount,r.due?'Yes':'No',wbPeriodLabel(per),r.state,r.elig.why,wbAllocStatus(r),wbTaxFlags(r).map(function(x){return x.text;}).join(' ')];}));
  showToast('Export ready','success',rows.length+' entitlements exported.');
}

/* ── Elsewhere in ADT ─────────────────────────────────────────────────── */
/* My Profile → My Benefits: the person's planned entitlements, never shown
   as a balance. emp is a directEmpData record. */
/* self: the person acting is this employee (first person), else third person. */
/* Can the Generate popup create a batch for the period it shows? */
function wbGenState(){
  const d=(wbModal&&wbModal.draft)||{};
  const per=wbPeriods().find(function(x){return wbPeriodLabel(x)===d.period;})||wbCurPeriod();
  const live=wbMine(wbBatches).find(function(b){return b.period===per&&WB_LIVE_BATCH.indexOf(b.status)>=0;});
  if(live)return {blocked:true,why:live.key+' is '+live.status+' for this period'};
  if(!wbBuild(per).rows.length)return {blocked:true,why:'Nothing to generate for this period'};
  return {blocked:false,why:''};
}
function wbMyBenefitsHTML(rec,self){
  const emp=rec&&rec.eid?wbEmployees().find(function(x){return x.eid===rec.eid;}):null;
  if(!emp)return '<div class="ep-form-card"><div class="wb-empty-sm">Benefits apply to Direct (India) employees.</div></div>';
  if(self==null)self=typeof oncIsSelf==='function'&&oncIsSelf(rec);
  const per=wbToday().slice(0,7),fy=wbFYOf(per);
  const rows=wbMine(wbCategories).map(function(c){
    const r=wbResolve(emp,c,per);
    let year=0;wbFYPeriods(fy).forEach(function(p){const x=wbResolve(emp,c,p);if(x&&wbAllocatable(x))year+=x.amount;});
    if(!r&&!year)return '';
    const ld=typeof wbLoadedThisPeriod==='function'?wbLoadedThisPeriod(emp.eid,c.id,per):'';   // the month's allocation already on the card
    const st=r?(r.conflict?'Being reviewed':ld?'Loaded to card · '+ld:!r.elig.ok?r.elig.why:wbAllocStatus(r)==='Approved'?'Approved for funding - not yet loaded':'Planned - not yet loaded'):'Not this month';
    return '<tr><td class="csag-td">'+sbEsc(c.name)+'<div class="wb-muted">'+(wbWalletOf(c)?sbEsc(wbTypeName(wbWalletOf(c).type))+' wallet':'Claim through Expenses')+'</div></td>'
      +'<td class="csag-td">'+(r?r.freq:'—')+'</td>'
      +'<td class="csag-td">'+(r&&wbAllocatable(r)?wbMoney(r.amount):'—')+'</td>'
      +'<td class="csag-td">'+wbMoney(year)+'</td>'
      +'<td class="csag-td">'+sbEsc(st)+'</td></tr>';
  }).join('');
  return '<div class="ep-form-card">'
    +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">'+(self?'My Benefits':'Benefits · '+sbEsc(emp.name))+' · '+wbPeriodLabel(per)+'</span></div>'
    +'<div class="wb-note">'+(self?'Your planned entitlements':'Planned entitlements for '+sbEsc(emp.name))+'. They are not wallet balances.</div>'
    +(rows?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Benefit</th><th>Frequency</th><th>This Month</th><th>'+wbFYLabel(fy)+' (planned)</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      :'<div class="wb-empty-sm">'+(self?'No benefit applies to you yet.':'No benefit applies to '+sbEsc(emp.name)+' yet.')+'</div>')
    +'</div>';
}
/* The expense form's claim-based hint: entitled / claimed / remaining. */
function wbClaimHintHTML(expCat,eid){
  if(!expCat||!eid)return '';
  const emp=wbEmpById(eid);if(!emp)return '';
  const per=wbToday().slice(0,7);
  const out=[];
  wbMine(wbCategories).forEach(function(c){
    if(c.processing!=='Claim-Based'||c.expCat!==expCat)return;
    const r=wbResolve(emp,c,per);if(!r||r.conflict||!r.elig.ok)return;
    const fy=wbFYOf(per);
    const span=r.freq==='Monthly'?{from:per+'-01',to:per+'-31',label:'this month'}:{from:fy+'-04-01',to:(fy+1)+'-03-31',label:'in '+wbFYLabel(fy)};
    const ent=r.freq==='Monthly'?r.amount:(function(){let y=0;wbFYPeriods(fy).forEach(function(p){const x=wbResolve(emp,c,p);if(x&&wbAllocatable(x))y+=x.amount;});return y;})();
    let claimed=0;
    (typeof expensesData!=='undefined'?expensesData:[]).forEach(function(x){
      if(x.name!==emp.name||x.category!==expCat||['Draft','Rejected','Withdrawn'].indexOf(x.status)>=0)return;
      if(x.entity&&x.entity!==wbEntity())return;
      /* What is still permitted while in approval; the approved amount once final. */
      x.lines.forEach(function(l){if(l.status!=='Rejected'&&l.start>=span.from&&l.start<=span.to)claimed+=l.approved!=null?Number(l.approved):(parseFloat(l.amount)||0);});
    });
    const left=ent-claimed;
    out.push('<div class="ea-hint exp-cap">Benefit ('+sbEsc(c.name)+'): <b>'+wbMoney(ent)+'</b> '+(r.freq==='Monthly'?'a month':'a year')+' · claimed '+wbMoney(claimed)+' '+span.label
      +(left>=0?' · '+wbMoney(left)+' remaining':'<span class="exp-cap-over"> · over by '+wbMoney(-left)+'</span>')+' <span class="wb-muted">(information only)</span></div>');
  });
  return out.join('');
}

/* ── Wiring ───────────────────────────────────────────────────────────── */
Object.assign(supportPageMeta,{'wallet-benefits':{title:'Wallet & Benefits',context:'Wallet & Benefits',filters:[],columns:[],rows:[]}});
if(typeof LP_ROW_PREFIX!=='undefined')['w','c','p','o','t','a','e'].forEach(function(k){LP_ROW_PREFIX['wb-'+k]='wb'+k;});
sbToneAdd({planned:'info','pending-approval':'wait',superseded:'idle','not-generated':'idle',conflict:'bad',
  eligible:'ok','not-eligible':'idle',applies:'ok','tax-advisory':'wait'});
['w','c','p','o','t'].forEach(function(k){
  sbDraftReg('wb'+k,{
    dirty:function(){if(!wbEdit||wbEdit.kind!==k||wbModal)return false;wbSync(k,wbEdit.draft);return JSON.stringify(wbEdit.draft)!==wbEdit.orig;},
    drop:wbDropEdit});
});
['w','c','p','o','t','a'].forEach(function(k){
  if(typeof rlRegister!=='function')return;
  rlRegister('wb-'+k,{pre:'wb'+k,recordLabel:WB_KIND_NAME[k].charAt(0).toUpperCase()+WB_KIND_NAME[k].slice(1),
    rec:function(id){return wbRec(k,Number(id));},
    status:function(r){return wbShown(k,r);},
    moves:function(r){return wbMoves(k,r);},
    label:function(v){return (WB_MOVE_LABELS[k]||{})[v]||v;},
    save:function(id){wbCommitLog(k,Number(id));},
    count:function(r){return wbSeedLogs(k,r).length;},
    open:function(id){wbOpen(k,Number(id));},
    logs:function(id){wbOpen(k,Number(id),'logs');},
    sub:function(r){return (r.key||'')+' &middot; '+sbEsc(r.name||(k==='a'?wbPeriodLabel(r.period):k==='o'?(wbEmpById(r.eid)||{}).name||'':wbTypeName(r.type)));}});
});
/* Seed the history: October approved, November waiting for Finance. */
(function(){
  try{
    const oct=wbMakeBatch('2026-10',wbBuild('2026-10'),{by:'Pallavi Parate',byId:(idUserByEmail('pallavi@testemp.com')||{}).userId,role:'HR Admin',stamp:{date:'28 Sep 2026',time:'10:15:00 AM'}});
    oct.status='Approved';oct.submittedBy='Pallavi Parate';oct.submittedById=oct.generatedById;oct.approvedBy='Meera Iyer';oct.approvedById=(idUserByEmail('meera@testemp.com')||{}).userId;oct.approvedAt='30 Sep 2026 | 04:40:00 PM';
    oct.logs.unshift(wbLog('28 Sep 2026','10:20:00 AM','Pallavi Parate','Pending Approval','Submitted for approval.'));
    oct.logs.unshift(wbLog('30 Sep 2026','04:40:00 PM','Vikram Rao','Approved','Checked against the October headcount. Approved for funding.'));
    const nov=wbMakeBatch('2026-11',wbBuild('2026-11'),{by:'Pallavi Parate',byId:(idUserByEmail('pallavi@testemp.com')||{}).userId,role:'HR Admin',stamp:{date:'03 Nov 2026',time:'11:05:00 AM'}});
    nov.status='Pending Approval';nov.submittedBy='Pallavi Parate';
    nov.logs.unshift(wbLog('03 Nov 2026','11:10:00 AM','Pallavi Parate','Pending Approval','Submitted for approval. Includes the Diwali gift.'));
  }catch(err){if(typeof console!=='undefined')console.error('Wallet & Benefits seed failed',err);}
})();

/* ── Card spend evidence per benefit category (B8-N22, 8 Nov 2026) ─────────
   Wallet & Benefits is the source of truth for what a cardholder provides for a card spend from the wallet of a
   Wallet-Funded category: nothing more, a receipt or bill, an employee declaration, or both. Effective-dated rules
   on the category (additive field evidenceRules), prospective, with a reason; Claim-Based categories keep the
   expense receipt rules. Corporate Cards reads the rule; it never keeps its own. */
const WB_EVIDENCE=['No additional evidence','Receipt/Bill Required','Employee Declaration Required','Receipt/Bill and Declaration Required'];
function wbCatEvidenceRules(c){return (c&&c.evidenceRules||[]).filter(function(x){return !x.replaced;});}
function wbCatEvidenceAt(c,iso){
  const vs=wbCatEvidenceRules(c).filter(function(x){return x.effFrom<=iso;}).sort(function(a,b){return a.effFrom<b.effFrom?1:a.effFrom>b.effFrom?-1:b.v-a.v;});
  return vs[0]||{rule:WB_EVIDENCE[0],effFrom:'',v:0,none:true};
}
function wbCatEvidenceNext(c){const t=wbToday();return wbCatEvidenceRules(c).filter(function(x){return x.effFrom>t;}).sort(function(a,b){return a.effFrom<b.effFrom?-1:1;})[0]||null;}
function wbCatEvidenceScheduled(c){const t=wbToday();return wbCatEvidenceRules(c).filter(function(x){return x.effFrom>t;}).sort(function(a,b){return a.effFrom<b.effFrom?-1:a.effFrom>b.effFrom?1:a.v-b.v;});}
function wbCatEvidenceText(c){
  const cur=wbCatEvidenceAt(c,wbToday()),nx=wbCatEvidenceScheduled(c);
  return cur.rule+(cur.effFrom?' (from '+wbDate(cur.effFrom)+')':'')+(nx.length?' · scheduled: '+nx.map(function(x){return x.rule+' from '+wbDate(x.effFrom);}).join('; '):'');
}
function wbCatEvidencePush(c,o){
  c.evidenceRules=c.evidenceRules||[];
  const same=c.evidenceRules.find(function(x){return !x.replaced&&x.effFrom===o.effFrom;});
  if(same)same.replaced={by:o.by,at:o.at};
  const r={v:c.evidenceRules.length+1,rule:o.rule,effFrom:o.effFrom,reason:o.reason,source:o.source||'Wallet & Benefits',by:o.by,byId:o.byId||'',actual:o.actual||'',at:o.at,migratedFrom:o.migratedFrom||null};
  c.evidenceRules.push(r);
  const s=stampNow();wbSeedLogs('c',c);
  c.logs.unshift(wbLog(s.date,s.time,o.by||wbActor(),wbShown('c',c),'Card spend evidence: '+r.rule+' from '+wbDate(r.effFrom)+(same?' (replaces the rule not yet in effect from the same date)':'')
    +'. Reason: '+r.reason+(r.migratedFrom?' Source: '+r.migratedFrom+'.':'')));
  return r;
}
function wbCatEvidenceCheck(c,rule,from,reason){
  if(!c)return 'No such benefit category.';
  if(c.processing!=='Wallet-Funded')return c.name+' is Claim-Based: its claims follow the expense receipt rules. Card spend evidence applies to Wallet-Funded categories only.';
  if(WB_EVIDENCE.indexOf(rule)<0)return 'Pick the card spend evidence rule.';
  if(!from)return 'Enter the date the evidence rule applies from.';
  if(from<wbToday())return 'The evidence rule applies from today or later; card spends already made keep the rule that applied to them.';
  if(c.effTo&&from>c.effTo)return c.name+' ends on '+wbDate(c.effTo)+'.';
  const same=wbCatEvidenceRules(c).find(function(x){return x.effFrom===from;});
  if(same&&from<=wbToday())return 'A rule already took effect on '+wbDate(from)+': give a later date.';
  if(wbCatEvidenceAt(c,from).rule===rule&&!same)return rule+' already applies on '+wbDate(from)+'.';
  if(String(reason||'').trim().length<5)return 'Say why the evidence rule is set or changed; it is kept in the category history.';
  return '';
}
/* From a script or the panel: benefit.category.manage; the actual actor is kept under Switch User. */
function wbCatEvidenceSave(id,d){
  d=d||{};const c=wbRec('c',id);
  if(!wbCan('benefit.category.manage'))return wbActor()+' cannot change benefit categories (benefit.category.manage).';
  const e=wbCatEvidenceCheck(c,d.rule,d.effFrom,d.reason);if(e)return e;
  const s=stampNow();
  wbCatEvidencePush(c,{rule:d.rule,effFrom:d.effFrom,reason:String(d.reason).trim(),by:wbActor(),byId:wbActorId(),
    actual:typeof idSwitched==='function'&&idSwitched()&&typeof idAuthMe==='function'?idAuthMe():'',at:s.date+' | '+s.time});
  return '';
}
function wbCatEvidenceRowsHTML(c){
  const R=(c.evidenceRules||[]).slice().reverse();if(!R.length)return '';
  return '<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Card Spend Evidence</th><th>From</th><th>Reason</th><th>Set By</th></tr></thead><tbody>'
    +R.map(function(r){return '<tr><td class="csag-td">'+sbEsc(r.rule)+(r.replaced?' <span class="wb-muted">replaced before it applied</span>':'')+'</td><td class="csag-td">'+wbDate(r.effFrom)+'</td><td class="csag-td" style="white-space:normal">'+sbEsc(r.reason)+(r.migratedFrom?'<div class="wb-muted">'+sbEsc(r.migratedFrom)+'</div>':'')+'</td>'
      +'<td class="csag-td">'+sbEsc(r.by)+'<div class="wb-muted">'+sbEsc(r.at||'')+(r.actual?' · through Switch User by '+sbEsc(typeof caN==='function'?caN(r.actual):r.actual):'')+'</div></td></tr>';}).join('')+'</tbody></table></div>';
}

/* ── Evidence Policy Configuration Conflicts (final decision 8 Nov 2026): 8D card-policy evidence that cannot be moved cleanly
   waits here for an authorized Wallet & Benefits administrator. B: Wallet & Benefits already has a different rule (it stays
   authoritative). C: the value maps to no single category. D: a programme required something the entity rule does not.
   Nothing is chosen silently; the resolution is recorded with its actor and reason. ── */
const wbEvConflicts=[];let wbEvcNext=1;
const WB_EVC_CASE={B:'Wallet & Benefits already has a different rule',C:'Cannot be mapped to one benefit category',D:'Programme-level requirement differs from the category rule'};
function wbEvConflictAdd(o){
  const ex=wbEvConflicts.find(function(x){return x.entity===o.entity&&x.walletCode===o.walletCode&&x.legacySource===o.legacySource;});if(ex)return ex;
  const s=stampNow(),x=Object.assign({id:wbEvcNext,key:'EVC-'+(1000+wbEvcNext),status:'Open',history:[{at:s.date+' | '+s.time,by:'System',to:'Open',note:'Detected while moving benefit evidence from the card policy to Wallet & Benefits'}]},o);wbEvcNext++;
  wbEvConflicts.push(x);
  (o.categoryIds||[]).forEach(function(id){const c=wbRec('c',id);if(!c)return;wbSeedLogs('c',c);c.logs.unshift(wbLog(s.date,s.time,'System',wbShown('c',c),'Evidence configuration conflict '+x.key+': '+WB_EVC_CASE[x.case]+' ('+x.legacySource+' required '+x.legacyRule+'). Review it in Categories.'));});
  return x;
}
function wbEvOpen(ent){return wbEvConflicts.filter(function(x){return x.entity===(ent||wbEntity())&&x.status==='Open';});}
/* The open conflict that leaves a card spend without an authoritative rule (C, or B/D where no category rule exists). */
function wbEvConflictFor(ent,code,day){return wbEvConflicts.find(function(x){return x.entity===ent&&x.status==='Open'&&x.walletCode===code&&x.legacyFrom<=day;})||null;}
function wbEvConflictResolve(id,d){
  d=d||{};const x=wbEvConflicts.find(function(y){return y.id===Number(id);});if(!x||x.status!=='Open')return 'No open evidence configuration conflict.';
  if(!wbCan('benefit.category.manage'))return wbActor()+' cannot resolve benefit evidence configuration (benefit.category.manage).';
  const reason=String(d.reason||'').trim();if(reason.length<10)return 'Say why (at least 10 characters); it is kept with the conflict.';
  const act=['Keep Wallet & Benefits Rule','Apply Legacy Rule','Not Applicable'].indexOf(d.action)>=0?d.action:'';if(!act)return 'Pick the resolution.';
  const s=stampNow(),at=s.date+' | '+s.time;let note='';
  if(act==='Keep Wallet & Benefits Rule'&&x.case==='C')return 'No single category is identified: apply the legacy rule to the right category, or mark it not applicable.';
  if(act==='Apply Legacy Rule'){
    const c=wbRec('c',Number(d.categoryId)||(x.categoryIds.length===1?x.categoryIds[0]:null));
    if(!c||c.processing!=='Wallet-Funded')return 'Pick the Wallet-Funded benefit category the legacy rule belongs to.';
    if(x.case!=='C'&&x.categoryIds.indexOf(c.id)<0)return c.name+' is not a category of this conflict.';
    const own=wbCatEvidenceRules(c).some(function(r){return !r.migratedFrom&&r.effFrom>=x.legacyFrom;});
    const from=own||x.legacyFrom<wbToday()&&x.case!=='C'?wbToday():(x.legacyFrom>c.effFrom?x.legacyFrom:c.effFrom);
    if(wbCatEvidenceAt(c,from).rule!==x.legacyRule)wbCatEvidencePush(c,{rule:x.legacyRule,effFrom:from,reason:'Evidence configuration conflict '+x.key+' resolved: '+reason,source:'Conflict resolution',by:wbActor(),byId:wbActorId(),
      actual:typeof idSwitched==='function'&&idSwitched()&&typeof idAuthMe==='function'?idAuthMe():'',at:at,migratedFrom:x.legacySource});
    note=x.legacyRule+' applied to '+c.key+' from '+wbDate(from);
  }else note=act;
  x.status='Resolved';x.resolution={action:act,note:note,reason:reason,by:wbActor(),byId:wbActorId(),actual:typeof idSwitched==='function'&&idSwitched()&&typeof idAuthMe==='function'?idAuthMe():'',at:at};
  x.history.push({at:at,by:wbActor(),to:'Resolved',note:note+'. '+reason});
  (x.categoryIds||[]).forEach(function(cid){const c=wbRec('c',cid);if(c){wbSeedLogs('c',c);c.logs.unshift(wbLog(s.date,s.time,wbActor(),wbShown('c',c),'Evidence configuration conflict '+x.key+' resolved: '+note+'. '+reason));}});
  return '';
}
let wbEvForm=null,wbEvInShell=false;
const WB_EVC_HINT={'Keep Wallet & Benefits Rule':'The category keeps its current Wallet & Benefits rule; the legacy card-policy value is set aside and kept in this conflict.',
  'Apply Legacy Rule':'The legacy requirement becomes a dated Wallet & Benefits rule of the category, with its source; earlier spends keep the rule of their date.',
  'Not Applicable':'The legacy value is closed without changing any rule (for example, the wallet no longer needs evidence).'};
function wbEvFormOpen(id,act){wbEvForm={id:id,action:act,reason:'',cat:''};renderADTPage();}
function wbEvFormClose(){wbEvForm=null;renderADTPage();}
function wbEvFormSave(){
  const f=wbEvForm;if(!f)return;const r=document.getElementById('wbevc-reason');if(r)f.reason=r.value;if(document.getElementById('csw-wbevc-cat'))f.cat=getCSValue('wbevc-cat');
  const c=f.cat?wbMine(wbCategories).find(function(x){return wbCatLabel(x)===f.cat;}):null;
  const e=wbEvConflictResolve(f.id,{action:f.action,categoryId:c?c.id:null,reason:f.reason});if(e){showToast('Not resolved','error',e);return;}
  wbEvForm=null;renderADTPage();showToast('Conflict resolved','success');
}
function wbEvConflictsHTML(){
  const L=wbEvOpen();if(!L.length)return '';
  const can=wbCan('benefit.category.manage'),wf=wbMine(wbCategories).filter(function(c){return c.processing==='Wallet-Funded'&&c.status!=='Inactive';});
  const rows=L.map(function(x){const cats=x.categoryIds.map(function(id){const c=wbRec('c',id);return c?c.name:'';}).filter(Boolean).join(', ')||'No category';
    const b=function(a){return '<button class="att-link" onclick="wbEvFormOpen('+x.id+',\''+a+'\')">'+a+'</button>';};
    return '<tr><td class="csag-td"><b>'+x.key+'</b><div class="wb-muted">'+sbEsc(WB_EVC_CASE[x.case])+'</div></td><td class="csag-td">'+sbEsc(cats)+'<div class="wb-muted">wallet '+sbEsc(wbTypeName(x.walletCode))+'</div></td>'
      +'<td class="csag-td" style="white-space:normal">'+sbEsc(x.legacyRule)+' from '+wbDate(x.legacyFrom)+'<div class="wb-muted">'+sbEsc(x.legacySource)+'</div></td><td class="csag-td">'+sbEsc(x.currentRule||'None')+(x.currentFrom?'<div class="wb-muted">from '+wbDate(x.currentFrom)+'</div>':'')+'</td>'
      +'<td class="csag-td">'+(can?'<div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px">'+(x.case!=='C'?b('Keep Wallet & Benefits Rule'):'')+b('Apply Legacy Rule')+b('Not Applicable')+'</div>':'')+'</td></tr>';}).join('');
  const f=wbEvForm&&L.some(function(x){return x.id===wbEvForm.id;})?wbEvForm:null,fx=f?L.find(function(x){return x.id===f.id;}):null;
  const pick=f&&f.action==='Apply Legacy Rule'&&fx.categoryIds.length!==1;
  const form=f?'<div class="ct-modal-overlay"><div class="ct-modal ct-modal--form ax-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+sbEsc(f.action)+' · '+fx.key+'</span><button class="ct-modal-close" onclick="wbEvFormClose()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">'+sbEsc(WB_EVC_HINT[f.action]||'')+' Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="ep-form-grid">'
    +wbFG('Legacy (card policy)',wbIn('wbevc-legacy',fx.legacyRule+' from '+wbDate(fx.legacyFrom),'','',true),{full:true,hint:sbEsc(fx.legacySource)})
    +wbFG('Current (Wallet & Benefits)',wbIn('wbevc-current',(fx.currentRule||'None')+(fx.currentFrom?' from '+wbDate(fx.currentFrom):''),'','',true),{full:true})
    +(pick?wbFG('Benefit Category',apCS('wbevc-cat',wf.map(wbCatLabel),f.cat,'Select Category'),{req:true,full:true,hint:'The Wallet-Funded category the legacy rule belongs to.'}):'')
    +wbFG('Reason',wbIn('wbevc-reason',f.reason,'Kept with the conflict and in the category history'),{req:true,full:true})+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="wbEvFormClose()">Cancel</button><button class="ep-save-btn" onclick="wbEvFormSave()">'+sbEsc(f.action)+'</button></div></div>'
    +'</div></div>':'';
  return '<div class="wb-note is-wait" style="margin-bottom:12px"><b>Evidence configuration review ('+L.length+')</b><div class="wb-note-sub">Card-spend evidence from the card policy that could not be moved to one category rule. Card spends without a rule are flagged to Finance until this is resolved.</div>'
    +'<div class="att-table-wrap csag-table-wrap" style="margin-top:8px"><table class="att-table csag-table"><thead><tr><th>Conflict</th><th>Category</th><th>Legacy (card policy)</th><th>Current (Wallet & Benefits)</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+form+'</div>';
}

const wbListCategoriesBase8G=wbListCategories;
wbListCategories=function(){wbEvInShell=true;try{return wbListCategoriesBase8G();}finally{wbEvInShell=false;}};
const wbListShellBase8G=wbListShell;
wbListShell=function(kind,o){if(kind==='c'&&wbEvInShell)o=Object.assign({},o,{top:(o.top||'')+wbEvConflictsHTML()});return wbListShellBase8G(kind,o);};
