/* ══ HR DOCS (FR-22) ═══════════════════════════════════════════════════════
   Letters HR issues to employees - experience, relieving, offer, warning and
   the rest - each produced from the ONE Active Template configured for its
   Document Type.

   THE LIFECYCLE, in the order FR-22 states it:

     Create        the Active Template for the type is loaded and its fields
                   are shown. Employee fields fill themselves from the
                   employee picked; the rest HR types.
     Save as Draft the values are kept; the document stays Draft and is
                   listed under Saved Drafts at the top of its type.
     Preview       the template rendered with what has been entered.
     Submit        the document moves to final review: Edit (back to the
                   fields, values kept), Download, or Save as Draft.

   WHO MAY DO WHAT (FR-22.1). Super Admin maintains templates and picks the
   Active one - one per type, never two. HR never sees a template: HR picks a
   type and gets the fields the Active Template asks for. Both read the role
   the rest of the app reads, CURRENT_USER_ROLE.

   FIELDS COME FROM THE TEMPLATE, NOT FROM A FORM DEFINITION. A template is a
   body with {{placeholders}}; the placeholders it uses ARE its fields. A
   catalogue below says how a known placeholder behaves - an employee picker,
   a value read off that employee, a date, a number, a choice. A placeholder
   the catalogue does not know becomes a plain text field. So when a Super
   Admin changes the Active Template, the Create form changes with it, which
   is FR-22.3's "the exact fields displayed shall depend on the selected
   Active Template". */

/* ── Who may maintain templates ────────────────────────────────────────── */
const HDOC_ADMIN_ROLES=['Entity Super Admin','Opendhi Platform Admin'];
function hdocIsAdmin(){return HDOC_ADMIN_ROLES.indexOf(CURRENT_USER_ROLE)>=0;}
/* TEMPLATE SETTINGS ARE HIDDEN FOR NOW. Every way into them - the gear on
   each row, the Templates button and "Active template" line on a type's
   screen, the template name in the Create popup - reads this one switch.
   Documents are still made from each type's Active Template; only the UI to
   see or change templates is off. Set to true to bring it all back. */
const HDOC_TEMPLATES_UI=false;
function hdocTplUI(){return HDOC_TEMPLATES_UI&&hdocIsAdmin();}

/* ── Document types ────────────────────────────────────────────────────── */
const HDOC_TYPES=[
  {key:'experience', label:'Experience Letter',          prefix:'EXP',blurb:'Certifies tenure and the role held.'},
  {key:'relieving',  label:'Relieving Letter',           prefix:'REL',blurb:'Confirms release after the last working day.'},
  {key:'internship', label:'Internship Letter',          prefix:'INT',blurb:'Certifies internship dates and project.'},
  {key:'offer',      label:'Offer Letter',               prefix:'OFR',blurb:'Offers a role with CTC and joining date.'},
  {key:'appointment',label:'Appointment Letter',         prefix:'APT',blurb:'Formally appoints a joined employee.'},
  {key:'increment',  label:'Increment Letter',           prefix:'INC',blurb:'Records a CTC revision and its effective date.'},
  {key:'confirmation',label:'Confirmation Letter',       prefix:'CNF',blurb:'Confirms service after probation.'},
  {key:'warn-leave', label:'Warning Letter - Leave',     prefix:'WLL',blurb:'Warns about unauthorised absence.'},
  {key:'warn-perf',  label:'Warning Letter - Performance',prefix:'WLP',blurb:'Warns about performance, with an improvement period.'}
];
function hdocTypeOf(key){return HDOC_TYPES.find(function(t){return t.key===key;})||null;}

/* ── People the letters are about, and who signs them ──────────────────── */
function hdocEmployees(){
  const de=(typeof directEmpData!=='undefined'?directEmpData:[]).map(function(e){
    return {name:e.name,empId:e.empId,designation:e.jobTitle,department:e.dept,location:e.branch,joinDate:e.joinDate,email:e.email,desc:e.desc};
  });
  const ge=(typeof globalEmpData!=='undefined'?globalEmpData:[]).map(function(e){
    return {name:e.name,empId:e.empId,designation:e.jobTitle,department:e.dept,location:e.country,joinDate:e.joinDate,email:e.email};
  });
  return de.concat(ge);
}
function hdocEmp(name){return hdocEmployees().find(function(e){return e.name===name;})||null;}
/* What a prefill field takes from the employee picked (HDOC_FIELDS .prefill).
   joinDate is read as dd Mon yyyy; the annual pay is the monthly salary
   structure (Attendance → Salary) times twelve, where the employee has one. */
function hdocPrefillVal(src,e){
  if(!e)return '';
  if(src==='joinDate'){const d=new Date(e.joinDate);return isNaN(d)?'':cdISO(d);}
  if(src==='empType'){const s=String(e.desc||'').toLowerCase();
    return s.indexOf('contract')>=0?'Contract':s.indexOf('part')>=0?'Part Time':s.indexOf('intern')>=0?'Intern':s.indexOf('full')>=0?'Full Time':'';}
  if(src==='annualPay'){
    const p=typeof AT_PAY!=='undefined'&&AT_PAY[e.empId];if(!p)return '';
    return String(12*(p.basic+p.earnings.reduce(function(s,x){return s+(x.amt||0);},0)));
  }
  return e[src]||'';
}
/* A select's options: a fixed list, or one read off the people on record. */
function hdocOpts(f){
  if(f.opts==='designations')return hdocUniq(HDOC_FIELDS.offered_designation.opts.concat(hdocEmployees().map(function(e){return e.designation;})));
  if(f.opts==='locations')return hdocUniq(['Hyderabad','Bangalore','Mumbai','Delhi','Pune','Chennai','Punjab'].concat(hdocEmployees().map(function(e){return e.location;})));
  return f.opts;
}
function hdocUniq(a){return a.filter(function(x,i){return x&&x!=='--'&&a.indexOf(x)===i;});}
/* The Active payheads of one category (Earning / Deduction), from Payheads. */
function hdocPayheads(cat){
  return (typeof payheadsData!=='undefined'?payheadsData:[])
    .filter(function(p){return p.category===cat&&p.status==='Active';}).map(function(p){return p.name;});
}
const HDOC_SIGNATORIES=[{name:'Pallavi Parate',desig:'HR Manager'},{name:'Shaun Mathew',desig:'Director'}];
function hdocCompany(){
  return (typeof hdCurrentEntityName==='function'&&hdCurrentEntityName())||'Dhi Hyperlocal Pvt Ltd';
}

/* ── The field catalogue ───────────────────────────────────────────────────
   type      employee | auto | signatory | date | time | number | text | textarea
             | select | multi | words
   from      for auto fields: which employee (or signatory) value they read   */
const HDOC_FIELDS={
  employee_name:      {label:'Employee Name',type:'employee',req:true},
  employee_id:        {label:'Employee ID',type:'auto',from:'empId'},
  designation:        {label:'Designation',type:'auto',from:'designation'},
  department:         {label:'Department',type:'auto',from:'department'},
  work_location:      {label:'Work Location',type:'auto',from:'location'},
  date_of_joining:    {label:'Date of Joining',type:'auto',from:'joinDate'},
  employee_email:     {label:'Employee Email',type:'auto',from:'email'},
  issue_date:         {label:'Issue Date',type:'date',req:true,today:true},
  last_working_day:   {label:'Last Working Day',type:'date',req:true},
  resignation_date:   {label:'Resignation Date',type:'date',req:true},
  candidate_name:     {label:'Candidate Name',type:'text',req:true,ph:'Full name'},
  salutation:         {label:'Salutation',type:'select',req:true,opts:['Mr.','Ms.','Miss.']},
  candidate_address:  {label:'Candidate Address',type:'textarea',req:true,ph:'Postal address'},
  offered_designation:{label:'Designation',type:'select',req:true,opts:['Software Engineer','Developer','QA Engineer','Product Manager','UX Designer','HR Manager','Finance Analyst','Sales Executive']},
  offered_department: {label:'Offered Department',type:'select',req:true,opts:['Engineering','Product','Design','HR','Finance','Sales','Operations']},
  proposed_joining:   {label:'Date of Joining',type:'date',req:true},
  reporting_time:     {label:'Reporting Time',type:'time',req:true},
  offer_valid_till:   {label:'Offer Valid Until',type:'date',req:true},
  annual_ctc:         {label:'Annual CTC (₹)',type:'number',req:true,ph:'e.g. 1200000'},
  annual_compensation:{label:'Annual Compensation (₹)',type:'number',req:true,ph:'e.g. 1200000'},
  /* words: written out from another field's amount, never typed. */
  annual_compensation_words:{label:'Annual Compensation in Words',type:'words',from:'annual_compensation'},
  /* multi: several picks from the active payheads of one category. */
  earning_heads:      {label:'Earning Heads',type:'multi',req:true,heads:'Earning'},
  deduction_heads:    {label:'Deduction Heads',type:'multi',heads:'Deduction'},
  annual_bonus_pct:   {label:'Total Annual Bonus (%)',type:'text',ph:'e.g. 10'},
  /* Appointment Letter. prefill: filled from the employee when one is picked,
     and still editable - unlike auto, which is read-only. */
  employee_location:  {label:'Employee Location',type:'textarea',req:true,ph:'Filled from the employee',prefill:'location'},
  appt_designation:   {label:'Designation',type:'select',req:true,search:true,opts:'designations',prefill:'designation'},
  appt_effective_date:{label:'Appointment Effective Date',type:'date',req:true,prefill:'joinDate'},
  employment_type:    {label:'Employment Type',type:'select',req:true,opts:['Full Time','Part Time','Contract','Intern'],prefill:'empType'},
  appt_work_location: {label:'Work Location',type:'select',req:true,opts:'locations',prefill:'location'},
  appt_annual_compensation:{label:'Annual Compensation (₹)',type:'number',req:true,ph:'From the salary structure',prefill:'annualPay'},
  probation_period:   {label:'Probation Period',type:'select',req:true,opts:['3 months','6 months','12 months']},
  notice_period:      {label:'Notice Period',type:'select',req:true,opts:['30 days','60 days','90 days']},
  internship_start:   {label:'Internship Start Date',type:'date',req:true},
  internship_end:     {label:'Internship End Date',type:'date',req:true},
  project_title:      {label:'Project / Assignment',type:'text',req:true,ph:'e.g. Payroll analytics dashboard'},
  stipend:            {label:'Monthly Stipend (₹)',type:'number',ph:'e.g. 15000'},
  previous_ctc:       {label:'Previous Annual CTC (₹)',type:'number',req:true,ph:'e.g. 900000'},
  revised_ctc:        {label:'Revised Annual CTC (₹)',type:'number',req:true,ph:'e.g. 1035000'},
  effective_date:     {label:'Effective Date',type:'date',req:true},
  confirmation_date:  {label:'Confirmation Date',type:'date',req:true},
  absence_from:       {label:'Absent From',type:'date',req:true},
  absence_to:         {label:'Absent To',type:'date',req:true},
  absence_details:    {label:'Details of Absence',type:'textarea',req:true,ph:'What happened, and what policy it breaches'},
  performance_concerns:{label:'Performance Concerns',type:'textarea',req:true,ph:'The specific shortfalls observed'},
  improvement_period: {label:'Improvement Period',type:'select',req:true,opts:['30 days','60 days','90 days']},
  signatory_name:     {label:'Signatory',type:'signatory',req:true},
  signatory_designation:{label:'Signatory Designation',type:'auto',from:'sigDesig'}
};
function hdocHuman(key){return key.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});}
function hdocFieldDef(key){return HDOC_FIELDS[key]||{label:hdocHuman(key),type:'text',req:true};}
/* The placeholders a template uses, in the order they first appear. */
function hdocTemplateKeys(tpl){
  const seen=[];const re=/\{\{\s*([a-z0-9_]+)\s*\}\}/g;let m;
  const src=(tpl.heading||'')+'\n'+(tpl.body||'');
  while((m=re.exec(src)))if(seen.indexOf(m[1])<0)seen.push(m[1]);
  /* The company is the entity being worked in, never a field to fill. */
  return seen.filter(function(k){return k!=='company_name';});
}
/* What HR is asked for. Auto values are shown, read-only, beside the field
   they come from; anything the template uses that depends on a picked
   employee or signatory pulls that picker in even if the body never names it. */
function hdocFormKeys(tpl){
  const keys=hdocTemplateKeys(tpl);
  const needsEmp=keys.some(function(k){const d=hdocFieldDef(k);return d.type==='auto'&&d.from!=='sigDesig';});
  const needsSig=keys.indexOf('signatory_designation')>=0;
  if(needsEmp&&keys.indexOf('employee_name')<0)keys.unshift('employee_name');
  if(needsSig&&keys.indexOf('signatory_name')<0)keys.push('signatory_name');
  /* Pickers first, then everything else in template order - the employee
     decides half the form, so it is the first thing asked. */
  const first=keys.filter(function(k){return hdocFieldDef(k).type==='employee';});
  const out=first.concat(keys.filter(function(k){return first.indexOf(k)<0;}));
  /* A template may set the order its form asks in (fieldOrder); anything it
     does not list keeps its place after the listed ones. */
  if(tpl.fieldOrder){
    const at=function(k){const i=tpl.fieldOrder.indexOf(k);return i<0?999+out.indexOf(k):i;};
    out.sort(function(a,b){return at(a)-at(b);});
  }
  return out;
}

/* ── Templates ─────────────────────────────────────────────────────────── */
const SIG_BLOCK='\n\nFor {{company_name}}\n\n\n{{signatory_name}}\n{{signatory_designation}}';
const hdocTemplates=[
  {id:1,type:'experience',name:'Experience Letter - Standard',heading:'EXPERIENCE CERTIFICATE',status:'Active',updatedBy:'Shaun Mathew',updatedAt:'12 Aug 2026',
   body:'Date: {{issue_date}}\n\nTO WHOMSOEVER IT MAY CONCERN\n\nThis is to certify that {{employee_name}} (Employee ID: {{employee_id}}) was employed with {{company_name}} as {{designation}} in the {{department}} department from {{date_of_joining}} to {{last_working_day}}.\n\nDuring this period we found {{employee_name}} to be sincere, hardworking and dedicated to the responsibilities entrusted to them. Their conduct throughout the tenure was good.\n\nWe wish them every success in their future endeavours.'+SIG_BLOCK},
  {id:2,type:'experience',name:'Experience Letter - Short form',heading:'EXPERIENCE LETTER',status:'Inactive',updatedBy:'Shaun Mathew',updatedAt:'02 Mar 2026',
   body:'Date: {{issue_date}}\n\nThis is to certify that {{employee_name}} worked with {{company_name}} as {{designation}} from {{date_of_joining}} to {{last_working_day}}.\n\nWe wish them the very best.'+SIG_BLOCK},
  {id:3,type:'relieving',name:'Relieving Letter - Standard',heading:'RELIEVING LETTER',status:'Active',updatedBy:'Shaun Mathew',updatedAt:'12 Aug 2026',
   body:'Date: {{issue_date}}\n\n{{employee_name}}\nEmployee ID: {{employee_id}}\n{{work_location}}\n\nDear {{employee_name}},\n\nWith reference to your resignation dated {{resignation_date}}, we confirm that you have been relieved from the services of {{company_name}} at the close of business hours on {{last_working_day}}.\n\nYou were working with us as {{designation}} in the {{department}} department since {{date_of_joining}}. Your full and final settlement has been processed as per company policy.\n\nWe thank you for your contributions and wish you success in the future.'+SIG_BLOCK},
  {id:4,type:'internship',name:'Internship Certificate - Standard',heading:'INTERNSHIP CERTIFICATE',status:'Active',updatedBy:'Shaun Mathew',updatedAt:'12 Aug 2026',
   body:'Date: {{issue_date}}\n\nTO WHOMSOEVER IT MAY CONCERN\n\nThis is to certify that {{employee_name}} has successfully completed an internship with {{company_name}} in the {{department}} department from {{internship_start}} to {{internship_end}}.\n\nDuring the internship they worked on "{{project_title}}" and showed a keen willingness to learn and a professional approach to their work.\n\nWe wish them all the best for their future.'+SIG_BLOCK},
  {id:5,type:'offer',name:'Offer Letter - Full time',heading:'OFFER OF EMPLOYMENT',status:'Active',updatedBy:'Shaun Mathew',updatedAt:'20 Sep 2026',
   /* The form asks in this order, not in the order the letter uses them. */
   fieldOrder:['issue_date','candidate_name','salutation','candidate_address','offered_designation','annual_compensation','annual_compensation_words',
     'proposed_joining','reporting_time','offer_valid_till','signatory_name','earning_heads','deduction_heads','annual_bonus_pct'],
   body:'Date: {{issue_date}}\n\n{{salutation}} {{candidate_name}}\n{{candidate_address}}\n\nDear {{salutation}} {{candidate_name}},\n\nWe are pleased to offer you the position of {{offered_designation}} at {{company_name}}.\n\nYour annual compensation will be ₹{{annual_compensation}} ({{annual_compensation_words}}), made up of the following heads:\nEarnings: {{earning_heads}}\nDeductions: {{deduction_heads}}\n\nYou will also be eligible for a total annual bonus of {{annual_bonus_pct}}% of your annual compensation, as per company policy.\n\nYour date of joining is {{proposed_joining}}. Please report to the office at {{reporting_time}} on that day.\n\nThis offer is valid until {{offer_valid_till}}. Please sign and return a copy of this letter as your acceptance.\n\nWe look forward to welcoming you to the team.'+SIG_BLOCK},
  {id:6,type:'offer',name:'Offer Letter - 2025 format',heading:'OFFER LETTER',status:'Inactive',updatedBy:'Shaun Mathew',updatedAt:'14 Jan 2025',
   body:'Date: {{issue_date}}\n\nDear {{candidate_name}},\n\nWe are happy to offer you the role of {{offered_designation}} at an annual CTC of ₹{{annual_ctc}}, joining on {{proposed_joining}}.'+SIG_BLOCK},
  {id:7,type:'appointment',name:'Appointment Letter - Standard',heading:'LETTER OF APPOINTMENT',status:'Active',updatedBy:'Shaun Mathew',updatedAt:'12 Aug 2026',
   fieldOrder:['issue_date','employee_name','salutation','employee_location','appt_designation','appt_effective_date','employment_type',
     'appt_work_location','appt_annual_compensation','earning_heads','deduction_heads','annual_bonus_pct','signatory_name'],
   body:'Date: {{issue_date}}\n\n{{salutation}} {{employee_name}}\n{{employee_location}}\n\nDear {{salutation}} {{employee_name}},\n\nFurther to your acceptance of our offer, we are pleased to appoint you as {{appt_designation}} at {{company_name}} on a {{employment_type}} basis, with effect from {{appt_effective_date}}. Your place of work will be {{appt_work_location}}.\n\nYour annual compensation will be ₹{{appt_annual_compensation}}, made up of the following heads:\nEarnings: {{earning_heads}}\nDeductions: {{deduction_heads}}\n\nYou will also be eligible for a total annual bonus of {{annual_bonus_pct}}% of your annual compensation, as per company policy.\n\nYou will be governed by the policies and rules of the company as amended from time to time.'+SIG_BLOCK},
  {id:8,type:'increment',name:'Increment Letter - Standard',heading:'SALARY REVISION LETTER',status:'Active',updatedBy:'Shaun Mathew',updatedAt:'12 Aug 2026',
   body:'Date: {{issue_date}}\n\n{{employee_name}}\nEmployee ID: {{employee_id}}, {{designation}}\n\nDear {{employee_name}},\n\nIn recognition of your contribution, we are pleased to inform you that your annual CTC has been revised from ₹{{previous_ctc}} to ₹{{revised_ctc}} with effect from {{effective_date}}.\n\nAll other terms and conditions of your employment remain unchanged. We look forward to your continued contribution.'+SIG_BLOCK},
  {id:9,type:'confirmation',name:'Confirmation Letter - Standard',heading:'CONFIRMATION OF EMPLOYMENT',status:'Active',updatedBy:'Shaun Mathew',updatedAt:'12 Aug 2026',
   body:'Date: {{issue_date}}\n\n{{employee_name}}\nEmployee ID: {{employee_id}}\n\nDear {{employee_name}},\n\nWe are pleased to inform you that, on successful completion of your probation period, your services as {{designation}} in the {{department}} department are confirmed with effect from {{confirmation_date}}.\n\nAll other terms of your appointment remain unchanged. We congratulate you and wish you a rewarding career with {{company_name}}.'+SIG_BLOCK},
  {id:10,type:'warn-leave',name:'Warning Letter - Unauthorised Absence',heading:'WARNING LETTER',status:'Active',updatedBy:'Shaun Mathew',updatedAt:'12 Aug 2026',
   body:'Date: {{issue_date}}\n\n{{employee_name}}\nEmployee ID: {{employee_id}}, {{designation}}\n\nSubject: Warning for unauthorised absence\n\nDear {{employee_name}},\n\nIt has been noted that you were absent from work from {{absence_from}} to {{absence_to}} without prior approval or intimation to your reporting manager.\n\n{{absence_details}}\n\nThis is in breach of the company leave policy. You are hereby warned that any repetition will lead to strict disciplinary action. Please acknowledge receipt of this letter.'+SIG_BLOCK},
  {id:11,type:'warn-perf',name:'Warning Letter - Performance',heading:'PERFORMANCE WARNING LETTER',status:'Active',updatedBy:'Shaun Mathew',updatedAt:'12 Aug 2026',
   body:'Date: {{issue_date}}\n\n{{employee_name}}\nEmployee ID: {{employee_id}}, {{designation}}, {{department}}\n\nSubject: Warning regarding performance\n\nDear {{employee_name}},\n\nThis letter is to formally bring to your attention concerns about your performance in your role as {{designation}}:\n\n{{performance_concerns}}\n\nYou are given {{improvement_period}} from the date of this letter to show clear and sustained improvement. Your manager will review your progress during this period. Failure to improve may result in further disciplinary action.'+SIG_BLOCK}
];
let hdocTplNextId=12;
function hdocActiveTemplate(type){
  return hdocTemplates.find(function(t){return t.type===type&&t.status==='Active';})||null;
}
function hdocTemplateById(id){return hdocTemplates.find(function(t){return t.id===id;})||null;}

/* ── Documents ─────────────────────────────────────────────────────────── */
const hdocDocs=[
  {id:1,no:'EXP-2026-0001',type:'experience',templateId:1,status:'Submitted',createdBy:'Pallavi Parate',createdAt:'14 Feb 2025 | 11:05 AM',updatedAt:'14 Feb 2025 | 11:20 AM',
   values:{employee_name:'Rahul Mehta',issue_date:'2025-02-14',last_working_day:'2025-02-12',signatory_name:'Pallavi Parate'}},
  {id:2,no:'APT-2026-0001',type:'appointment',templateId:7,status:'Submitted',createdBy:'Pallavi Parate',createdAt:'15 Jan 2025 | 10:00 AM',updatedAt:'15 Jan 2025 | 10:12 AM',
   values:{employee_name:'Antar Malhotra',issue_date:'2025-01-15',salutation:'Mr.',employee_location:'Punjab',appt_designation:'Software Engineer',
     appt_effective_date:'2025-01-15',employment_type:'Full Time',appt_work_location:'Punjab',appt_annual_compensation:'1200000',
     earning_heads:['Basic Salary','House Rent Allowance'],deduction_heads:['Provident Fund','Professional Tax'],signatory_name:'Shaun Mathew'}},
  {id:3,no:'OFR-2026-0001',type:'offer',templateId:5,status:'Submitted',createdBy:'Pallavi Parate',createdAt:'28 Aug 2026 | 04:15 PM',updatedAt:'28 Aug 2026 | 04:30 PM',
   values:{candidate_name:'Meera Iyer',salutation:'Ms.',candidate_address:'12 Jubilee Hills, Hyderabad 500033',issue_date:'2026-08-28',offered_designation:'UX Designer',
     annual_compensation:'1450000',proposed_joining:'2026-09-15',reporting_time:'10:00',offer_valid_till:'2026-09-05',signatory_name:'Pallavi Parate',
     earning_heads:['Basic Salary','House Rent Allowance'],deduction_heads:['Provident Fund','Professional Tax'],annual_bonus_pct:'10'}},
  {id:4,no:'INC-2026-0001',type:'increment',templateId:8,status:'Submitted',createdBy:'Pallavi Parate',createdAt:'01 Apr 2026 | 09:30 AM',updatedAt:'01 Apr 2026 | 09:45 AM',
   values:{employee_name:'Anika Shah',issue_date:'2026-04-01',previous_ctc:'900000',revised_ctc:'1035000',effective_date:'2026-04-01',signatory_name:'Shaun Mathew'}},
  {id:5,no:'',type:'confirmation',templateId:9,status:'Draft',createdBy:'Pallavi Parate',createdAt:'30 Sep 2026 | 03:10 PM',updatedAt:'02 Oct 2026 | 11:40 AM',
   values:{employee_name:'Anika Shah',issue_date:'2026-10-02',confirmation_date:''}},
  {id:6,no:'',type:'warn-leave',templateId:10,status:'Draft',createdBy:'Shaun Mathew',createdAt:'03 Oct 2026 | 10:05 AM',updatedAt:'03 Oct 2026 | 10:05 AM',
   values:{employee_name:'Dev Kulkarni',issue_date:'2026-10-03',absence_from:'2026-09-22',absence_to:'2026-09-24',absence_details:''}},
  {id:7,no:'',type:'offer',templateId:5,status:'Draft',createdBy:'Pallavi Parate',createdAt:'04 Oct 2026 | 05:25 PM',updatedAt:'04 Oct 2026 | 05:25 PM',
   values:{candidate_name:'Karan Verma',salutation:'Mr.',offered_designation:'Software Engineer',annual_compensation:'1600000'}}
];
let hdocDocNextId=8;
function hdocStampNow(){const s=stampNow();return s.date+' | '+s.time.replace(/:\d\d (AM|PM)$/,' $1');}
function hdocDrafts(type){
  return hdocDocs.filter(function(d){return d.status==='Draft'&&(!type||d.type===type);});
}
function hdocIssued(type){
  return hdocDocs.filter(function(d){return d.status==='Submitted'&&(!type||d.type===type);});
}
function hdocNextNo(type){
  const t=hdocTypeOf(type);const yr=new Date().getFullYear();
  const n=hdocDocs.filter(function(d){return d.type===type&&d.no;}).length+1;
  return t.prefix+'-'+yr+'-'+String(n).padStart(4,'0');
}
/* Who a document is about - the employee, or the candidate on an offer. */
function hdocSubject(d){return (d.values&&(d.values.employee_name||d.values.candidate_name))||'';}

/* ── Values: what HR typed, plus what is read off the people picked ─────── */
function hdocResolve(values){
  const v=Object.assign({},values||{});
  const e=hdocEmp(v.employee_name);
  Object.keys(HDOC_FIELDS).forEach(function(k){
    const f=HDOC_FIELDS[k];
    if(f.type==='auto'&&f.from!=='sigDesig')v[k]=e?(e[f.from]||''):'';
  });
  const sg=HDOC_SIGNATORIES.find(function(s){return s.name===v.signatory_name;});
  v.signatory_designation=sg?sg.desig:'';
  Object.keys(HDOC_FIELDS).forEach(function(k){
    const f=HDOC_FIELDS[k];
    if(f.type==='words')v[k]=hdocAmountWords(v[f.from]);
  });
  v.company_name=hdocCompany();
  return v;
}
/* A value as it reads in a letter: dates spelled out, money grouped. */
function hdocFmt(key,val){
  if(val==null||val==='')return '';
  const f=hdocFieldDef(key);
  if(f.type==='date')return cdLabel(val)||val;
  if(f.type==='number'){const n=parseFloat(val);return isNaN(n)?val:n.toLocaleString('en-IN');}
  if(f.type==='multi')return [].concat(val).join(', ');
  if(f.type==='time'){
    const m=/^(\d{1,2}):(\d{2})/.exec(val);if(!m)return String(val);
    const h=+m[1];return ((h%12)||12)+':'+m[2]+' '+(h<12?'AM':'PM');
  }
  return String(val);
}
/* An amount in Indian-system words: 1450000 -> "Rupees Fourteen Lakh Fifty
   Thousand Only". Whole rupees; paise are dropped. */
function hdocAmountWords(val){
  let n=Math.floor(parseFloat(val));
  if(!isFinite(n)||n<0||String(val).trim()==='')return '';
  if(n===0)return 'Rupees Zero Only';
  const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen',
    'Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two=function(x){return x<20?ones[x]:tens[Math.floor(x/10)]+(x%10?' '+ones[x%10]:'');};
  const three=function(x){return (x>=100?ones[Math.floor(x/100)]+' Hundred'+(x%100?' ':''):'')+(x%100?two(x%100):'');};
  const parts=[];
  [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand']].forEach(function(u){
    const q=Math.floor(n/u[0]);
    if(q){parts.push((q>=100?hdocAmountWords(q).replace(/^Rupees |\sOnly$/g,''):two(q))+' '+u[1]);n%=u[0];}
  });
  if(n)parts.push(three(n));
  return 'Rupees '+parts.join(' ')+' Only';
}
function hdocWordsLive(el){
  const k=el.id.replace(/^hdf-/,'');
  Object.keys(HDOC_FIELDS).forEach(function(w){
    if(HDOC_FIELDS[w].type!=='words'||HDOC_FIELDS[w].from!==k)return;
    const out=document.getElementById('hdf-'+w);if(out)out.value=hdocAmountWords(el.value);
  });
}
function hdocEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
/* The letter as markup. A placeholder with no value yet is shown as its label
   in a marked box, so a Preview of a half-filled document shows what is
   missing instead of silently printing a gap. */
function hdocRenderLetter(tpl,values,docNo){
  const v=hdocResolve(values);
  const fill=function(src){
    return hdocEsc(src).replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g,function(_,k){
      if(k==='company_name')return hdocEsc(v.company_name);
      const out=hdocFmt(k,v[k]);
      return out?'<span class="hdoc-val">'+hdocEsc(out).replace(/\n/g,'<br>')+'</span>'
        :'<span class="hdoc-miss">'+hdocEsc(hdocFieldDef(k).label)+'</span>';
    });
  };
  /* A line that uses an OPTIONAL field left empty is left out of the letter
     (no Deduction Heads, no bonus) - it is not missing, it does not apply. */
  const optEmpty=function(line){
    let skip=false;
    line.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g,function(_,k){
      const f=HDOC_FIELDS[k];
      if(f&&!f.req&&['text','textarea','number','date','time','select','multi'].indexOf(f.type)>=0&&!hdocFmt(k,v[k]))skip=true;
    });
    return skip;
  };
  const paras=String(tpl.body||'').split(/\n{2,}/).map(function(p){
    const kept=p.split('\n').filter(function(l){return !optEmpty(l);});
    return kept.length?'<p>'+fill(kept.join('\n')).replace(/\n/g,'<br>')+'</p>':'';
  }).join('');
  return '<div class="hdoc-paper">'
    +'<div class="hdoc-lh"><div class="hdoc-lh-name">'+hdocEsc(v.company_name)+'</div>'
      +'<div class="hdoc-lh-sub">Plot 21, HITEC City, Hyderabad 500081 · hr@dhihyperlocal.com</div></div>'
    +'<div class="hdoc-ref">'+(docNo?'Ref: '+hdocEsc(docNo):'Ref: <span class="hdoc-miss">Issued on submit</span>')+'</div>'
    +'<div class="hdoc-heading">'+fill(tpl.heading||'')+'</div>'
    +'<div class="hdoc-body">'+paras+'</div>'
    +'</div>';
}
function hdocMissing(tpl,values){
  const v=hdocResolve(values);
  return hdocFormKeys(tpl).filter(function(k){
    const f=hdocFieldDef(k);
    if(f.type==='auto'||f.type==='words')return false;
    return f.req&&!String(v[k]||'').trim();
  }).map(function(k){return hdocFieldDef(k).label;});
}

/* ══ STATE ═════════════════════════════════════════════════════════════════ */
let hdocType=null;            // null = the cards; a type key = that type's screen
let hdocQ='';
/* The one popup open, if any:
     {view:'form'|'preview'|'final', type, templateId, docId, values}
     {view:'templates', type}   {view:'tpl-edit', type, tplId}           */
let hdocModal=null;
function hdocReset(){hdocType=null;hdocQ='';hdocModal=null;}

/* ══ NAVIGATION ════════════════════════════════════════════════════════════ */
function hdocOpenType(key){hdocType=key;hdocQ='';renderADTPage();const c=document.getElementById('adt-content');if(c)c.scrollTop=0;}
function hdocBack(){hdocType=null;hdocQ='';renderADTPage();}
function hdocSearch(){hdocQ=lpSearchValue('hdoc-q');renderADTPage();}
function hdocClearSearch(){hdocQ='';renderADTPage();}

/* ══ CREATE / DRAFT / PREVIEW / SUBMIT ═════════════════════════════════════ */
/* FR-22.3: Create always loads the type's CURRENT Active Template. */
function hdocCreate(type,ev){
  if(ev)ev.stopPropagation();
  const tpl=hdocActiveTemplate(type);
  if(!tpl){showToast('No Active Template','error',hdocTypeOf(type).label+' has no Active Template yet. '
    +(hdocTplUI()?'Set one under Templates.':'Ask a Super Admin to set one.'));return;}
  const values={};
  hdocFormKeys(tpl).forEach(function(k){if(hdocFieldDef(k).today)values[k]=cdISO(new Date());});
  hdocModal={view:'form',type:type,templateId:tpl.id,docId:null,values:values};
  renderADTPage();
}
/* FR-22.7: a draft opens with what was entered. If the template it was
   started from is no longer the Active one, it moves to the Active one -
   HR only ever produces documents from the Active Template - and every value
   the new template still asks for comes along. */
function hdocOpenDoc(id){
  const d=hdocDocs.find(function(x){return x.id===id;});if(!d)return;
  let tplId=d.templateId;
  if(d.status==='Draft'){
    const act=hdocActiveTemplate(d.type);
    if(act&&act.id!==d.templateId){
      tplId=act.id;
      showToast('Template updated','info','This draft now uses the current Active Template for '+hdocTypeOf(d.type).label+'. Your entered values were kept.');
    }
  }
  hdocModal={view:d.status==='Draft'?'form':'final',type:d.type,templateId:tplId,docId:d.id,values:Object.assign({},d.values)};
  renderADTPage();
}
function hdocClose(){hdocModal=null;hdocSend=null;renderADTPage();}
/* Read every field on the form back into the working values. */
function hdocSync(){
  if(!hdocModal||hdocModal.view!=='form')return;
  const tpl=hdocTemplateById(hdocModal.templateId);if(!tpl)return;
  hdocFormKeys(tpl).forEach(function(k){
    const f=hdocFieldDef(k),id='hdf-'+k;
    if(f.type==='auto'||f.type==='words')return;
    if(f.type==='employee'||f.type==='signatory'||f.type==='select'){
      if(document.getElementById('csw-'+id))hdocModal.values[k]=getCSValue(id);
    }else if(f.type==='multi'){
      if(document.getElementById('msw-'+id))hdocModal.values[k]=getMSValue(id);
    }else{
      const el=document.getElementById(id);if(el)hdocModal.values[k]=el.value.trim?el.value.trim():el.value;
    }
  });
}
/* Picking an employee or a signatory fills the values read off them. A
   newly picked employee also refills every prefill field from their record;
   HR can still change each one afterwards. */
function hdocPickHook(){
  const m=hdocModal;if(!m)return;
  const was=m.values.employee_name;
  hdocSync();
  const name=m.values.employee_name;
  if(name&&name!==was){
    const e=hdocEmp(name),tpl=hdocTemplateById(m.templateId);
    if(e&&tpl)hdocFormKeys(tpl).forEach(function(k){
      const f=hdocFieldDef(k);
      if(f.prefill)m.values[k]=hdocPrefillVal(f.prefill,e);
    });
  }
  renderADTPage();
}
function hdocToPreview(){hdocSync();hdocModal.view='preview';renderADTPage();}
function hdocToForm(){hdocModal.view='form';renderADTPage();}
/* FR-22.4 / 22.5 / 22.6: Save as Draft keeps the values and the document
   stays (or goes back to) Draft, listed under Saved Drafts. */
function hdocSaveDraft(){
  hdocSync();
  const m=hdocModal;
  const hasAny=Object.keys(m.values).some(function(k){return String(m.values[k]||'').trim()&&!hdocFieldDef(k).today;});
  if(!hasAny){showToast('Nothing to save yet','error','Fill in at least one field before saving a draft.');return;}
  const now=hdocStampNow();
  let d=m.docId?hdocDocs.find(function(x){return x.id===m.docId;}):null;
  if(d){
    d.values=Object.assign({},m.values);d.templateId=m.templateId;d.status='Draft';d.updatedAt=now;
  }else{
    d={id:hdocDocNextId++,no:'',type:m.type,templateId:m.templateId,status:'Draft',createdBy:CURRENT_USER,
      createdAt:now,updatedAt:now,values:Object.assign({},m.values)};
    hdocDocs.unshift(d);
  }
  hdocModal=null;
  renderADTPage();
  showToast('Saved as draft','success',hdocTypeOf(d.type).label+(hdocSubject(d)?' for '+hdocSubject(d):'')+' is in Saved Drafts.');
}
/* FR-22.6: Submit moves the document to final review. Every field the
   template requires has to be there - a letter with a gap in it is not
   ready to be downloaded and handed to someone. */
function hdocSubmit(){
  const m=hdocModal;
  const tpl=hdocTemplateById(m.templateId);
  const miss=hdocMissing(tpl,m.values);
  if(miss.length){
    showToast('Complete the document first','error',miss.length===1?miss[0]+' is required.':miss.length+' fields are still empty — first: '+miss[0]+'.');
    hdocModal.view='form';renderADTPage();return;
  }
  const now=hdocStampNow();
  let d=m.docId?hdocDocs.find(function(x){return x.id===m.docId;}):null;
  if(!d){
    d={id:hdocDocNextId++,no:'',type:m.type,templateId:m.templateId,status:'Draft',createdBy:CURRENT_USER,createdAt:now,updatedAt:now,values:{}};
    hdocDocs.unshift(d);
  }
  d.values=Object.assign({},m.values);d.templateId=m.templateId;
  if(!d.no)d.no=hdocNextNo(d.type);
  d.status='Submitted';d.updatedAt=now;d.submittedAt=now;
  hdocModal={view:'final',type:d.type,templateId:d.templateId,docId:d.id,values:Object.assign({},d.values)};
  lpLanded('hr-docs',d.id);
  renderADTPage();
  showToast('Document submitted','success',d.no+' is ready to download.');
}
/* FR-22.6 Edit: back to the fields, values kept. */
function hdocEditFinal(){hdocModal.view='form';renderADTPage();}
/* FR-22.6 Download, in the shape of the Active Template it was made from.
   An HTML document saved as .doc opens in Word with the letterhead and the
   formatting intact - no server is needed to produce it. */
function hdocDownload(){
  const m=hdocModal;
  const d=hdocDocs.find(function(x){return x.id===m.docId;});
  const tpl=hdocTemplateById(m.templateId);if(!d||!tpl)return;
  const letter=hdocRenderLetter(tpl,d.values,d.no)
    .replace(/<span class="hdoc-val">/g,'<span>');
  const css='body{font-family:Calibri,Arial,sans-serif;color:#1e293b;font-size:11pt;line-height:1.6}'
    +'.hdoc-lh{border-bottom:2px solid #0f172a;padding-bottom:8pt;margin-bottom:14pt}.hdoc-lh-name{font-size:16pt;font-weight:bold}'
    +'.hdoc-lh-sub{font-size:9pt;color:#64748b}.hdoc-ref{font-size:9pt;color:#64748b;text-align:right}'
    +'.hdoc-heading{text-align:center;font-weight:bold;font-size:13pt;letter-spacing:1pt;margin:14pt 0}';
  const html='<html><head><meta charset="utf-8"><title>'+hdocEsc(d.no)+'</title><style>'+css+'</style></head><body>'+letter+'</body></html>';
  const blob=new Blob(['﻿',html],{type:'application/msword'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=hdocAttachName(d);
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},400);
  showToast('Downloading','success',a.download);
}
/* ══ FR-07.7 SEND IN MAIL ═════════════════════════════════════════════════
   Send opens a small dialog: To Email Address, Send, Cancel. The address is
   required. For a letter about an existing employee it is fetched from their
   record and stays editable; for an Offer Letter — and an Appointment or
   Internship Letter whose person is not yet an employee — there is no record,
   so HR types the candidate's address.
   Sending issues the letter: the same completeness check as Submit (a letter
   with gaps is not mailed to anyone), a document number, and a note on the
   document of who it went to and when.
   FR-07.8 adds the mail itself (From, CC, Subject, Body from the type's Mail
   Template, the document attached) - see MAIL CONFIGURATION below. */
/* ══ FR-07.8 MAIL CONFIGURATION ════════════════════════════════════════════
   Every document type has one HR Docs Mail Template: From, CC, Subject and
   Body. Send in Mail opens pre-filled from the template of the document's
   type, with the generated document attached; HR can adjust the mail for that
   one send without touching the template.

   The From / CC addresses and the wording below are PLACEHOLDERS. FR-07.8
   says HR provides and confirms the final values, so each template carries a
   status: "Awaiting HR Confirmation" until somebody confirms it in Mail
   Templates, "Confirmed" after. Editing a confirmed template sends it back
   to awaiting. A send from an unconfirmed template still goes, with a
   warning in the dialog - the demo should not dead-end on missing copy.

   Subject and Body take {{placeholders}}: the mail-only ones below, plus any
   field of the document itself ({{designation}}, {{proposed_joining}}...). */
const HDOC_MAIL_ROLES=HDOC_ADMIN_ROLES.concat(['HR Admin','HR Manager']);
/* MAIL TEMPLATE SETTINGS ARE HIDDEN FOR NOW - the Mail Templates button on
   HR Docs and the Mail Template button on each type read this one switch.
   Send in Mail still pre-fills from each type's template below. Set to true
   to bring the settings back. */
const HDOC_MAIL_TPL_UI=false;
function hdocMailUI(){return HDOC_MAIL_TPL_UI&&HDOC_MAIL_ROLES.indexOf(CURRENT_USER_ROLE)>=0;}
const HDOC_MAIL_VARS=[
  {k:'recipient_name',label:'Recipient Name'},
  {k:'document_type',label:'Document Type'},
  {k:'document_no',label:'Document No'},
  {k:'company_name',label:'Company Name'},
  {k:'sender_name',label:'Sender Name'}
];
const HDOC_MAIL_FROM='hr@dhihyperlocal.com';
const HDOC_MAIL_SIGN='\n\nRegards,\n{{sender_name}}\nHR Team, {{company_name}}';
const HDOC_MAIL_WORDING={
  offer:      ['Offer of Employment - {{company_name}}',
               'Dear {{recipient_name}},\n\nWe are delighted to offer you the position of {{offered_designation}} at {{company_name}}. Please find your Offer Letter ({{document_no}}) attached.\n\nKindly review the terms and confirm your acceptance by {{offer_valid_till}}.'],
  appointment:['Your Appointment Letter - {{company_name}}',
               'Dear {{recipient_name}},\n\nWelcome to {{company_name}}. Please find your Appointment Letter ({{document_no}}) attached, setting out the terms of your appointment.\n\nPlease keep it for your records and reach out to HR with any questions.'],
  internship: ['Your Internship Letter - {{company_name}}',
               'Dear {{recipient_name}},\n\nPlease find your Internship Letter ({{document_no}}) attached.\n\nThank you for your contribution to {{company_name}}.'],
  experience: ['Experience Letter - {{document_no}}',
               'Dear {{recipient_name}},\n\nPlease find your Experience Letter ({{document_no}}) attached.\n\nWe wish you every success in the future.'],
  relieving:  ['Relieving Letter - {{document_no}}',
               'Dear {{recipient_name}},\n\nPlease find your Relieving Letter ({{document_no}}) attached, confirming your release from {{company_name}}.\n\nWe wish you the very best.'],
  increment:  ['Revision of your compensation - {{company_name}}',
               'Dear {{recipient_name}},\n\nPlease find your Increment Letter ({{document_no}}) attached, with the details of your revised compensation.\n\nCongratulations, and thank you for your contribution.'],
  confirmation:['Confirmation of your services - {{company_name}}',
               'Dear {{recipient_name}},\n\nPlease find your Confirmation Letter ({{document_no}}) attached.\n\nCongratulations on completing your probation.'],
  'warn-leave':['{{document_type}} - {{document_no}}',
               'Dear {{recipient_name}},\n\nPlease find attached {{document_type}} ({{document_no}}). Kindly read it carefully and respond to HR within the time stated in the letter.'],
  'warn-perf':['{{document_type}} - {{document_no}}',
               'Dear {{recipient_name}},\n\nPlease find attached {{document_type}} ({{document_no}}). Kindly read it carefully; your manager and HR will follow up on the improvement plan.']
};
const hdocMailTemplates={};
HDOC_TYPES.forEach(function(t){
  const w=HDOC_MAIL_WORDING[t.key]||['{{document_type}} - {{document_no}}','Dear {{recipient_name}},\n\nPlease find your {{document_type}} ({{document_no}}) attached.'];
  hdocMailTemplates[t.key]={from:HDOC_MAIL_FROM,cc:'',subject:w[0],body:w[1]+HDOC_MAIL_SIGN,
    status:'Awaiting HR Confirmation',updatedBy:'System',updatedAt:'',confirmedBy:'',confirmedAt:''};
});
function hdocMailTpl(type){return hdocMailTemplates[type]||null;}
function hdocMailConfirmed(type){const t=hdocMailTpl(type);return !!t&&t.status==='Confirmed';}
function hdocMailFill(str,d){
  const v=hdocResolve(d.values);
  const ty=hdocTypeOf(d.type);
  const extra={recipient_name:hdocSubject(d),document_type:ty?ty.label:'',document_no:d.no||'',
    company_name:hdocCompany(),sender_name:CURRENT_USER};
  return String(str||'').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi,function(all,k){
    if(extra[k]!=null)return extra[k];
    const val=hdocFmt(k,v[k]);
    return val||all;
  });
}
function hdocAttachName(d){return d.no+'_'+hdocSubject(d).replace(/[^A-Za-z0-9]+/g,'_')+'.doc';}
const HDOC_EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function hdocSplitEmails(s){return String(s||'').split(/[,;]/).map(function(x){return x.trim();}).filter(Boolean);}

/* ── Mail Templates (configuration) ── */
function hdocOpenMailList(ev){
  if(ev)ev.stopPropagation();
  if(!hdocMailUI())return;
  hdocModal={view:'mail-list'};renderADTPage();
}
function hdocOpenMailEdit(type){
  if(!hdocMailUI())return;
  hdocModal={view:'mail-edit',type:type,back:!!(hdocModal&&hdocModal.view==='mail-list')};renderADTPage();
}
// Insert goes into whichever of Subject / Body was last focused.
let hdocMailLastFocus='hdm-body';
function hdocMailInsert(k){
  const el=document.getElementById(hdocMailLastFocus)||document.getElementById('hdm-body');
  if(!el)return;
  const tok='{{'+k+'}}',s=el.selectionStart!=null?el.selectionStart:el.value.length,e=el.selectionEnd!=null?el.selectionEnd:s;
  el.value=el.value.slice(0,s)+tok+el.value.slice(e);
  el.focus();el.selectionStart=el.selectionEnd=s+tok.length;
}
function hdocSaveMailTpl(confirm){
  const m=hdocModal;if(!m||m.view!=='mail-edit')return;
  const t=hdocMailTpl(m.type),ty=hdocTypeOf(m.type);
  const val=function(id){const el=document.getElementById(id);return el?el.value.trim():'';};
  const f={from:val('hdm-from'),cc:val('hdm-cc'),subject:val('hdm-subject'),body:val('hdm-body')};
  const err=function(id,title,msg){const el=document.getElementById(id);if(el){el.classList.add('is-bad');el.focus();setTimeout(function(){el.classList.remove('is-bad');},1600);}showToast(title,'error',msg);};
  if(!f.from)return err('hdm-from','From Email Address is required');
  if(!HDOC_EMAIL_RE.test(f.from))return err('hdm-from','Check the From address','Enter a valid email address, e.g. hr@company.com.');
  const bad=hdocSplitEmails(f.cc).filter(function(x){return !HDOC_EMAIL_RE.test(x);});
  if(bad.length)return err('hdm-cc','Check the CC addresses',bad[0]+' is not a valid email address.');
  if(!f.subject)return err('hdm-subject','Email Subject is required');
  if(!f.body)return err('hdm-body','Email Body is required');
  const changed=f.from!==t.from||f.cc!==t.cc||f.subject!==t.subject||f.body!==t.body;
  const st=hdocStampNow();
  Object.assign(t,f);
  if(changed){t.updatedBy=CURRENT_USER;t.updatedAt=st;}
  if(confirm){t.status='Confirmed';t.confirmedBy=CURRENT_USER;t.confirmedAt=st;}
  else if(changed&&t.status==='Confirmed'){t.status='Awaiting HR Confirmation';t.confirmedBy='';t.confirmedAt='';}
  hdocModal=m.back?{view:'mail-list'}:null;
  renderADTPage();
  showToast(confirm?'Mail template confirmed':'Mail template saved','success',
    ty.label+(confirm?' mails now go out with the confirmed wording.':t.status==='Confirmed'?'.':' · awaiting HR confirmation.'));
}
function hdocMailBadge(t){
  return '<span class="lp-status-badge tone-'+(t.status==='Confirmed'?'ok':'wait')+'">'+t.status+'</span>';
}
function hdocMailListHTML(){
  const rows=HDOC_TYPES.map(function(ty){
    const t=hdocMailTpl(ty.key);
    return '<tr style="cursor:pointer" onclick="hdocOpenMailEdit(\''+ty.key+'\')">'
      +'<td><div style="font-weight:600;color:var(--navy)">'+ty.label+'</div>'
        +'<div class="hdoc-tpl-sub hdoc-mail-subj">'+hdocEsc(t.subject)+'</div></td>'
      +'<td class="hdoc-mail-addr">'+hdocEsc(t.from)+(t.cc?'<div class="hdoc-tpl-sub">CC '+hdocEsc(t.cc)+'</div>':'')+'</td>'
      +'<td>'+hdocMailBadge(t)+(t.confirmedBy?'<div class="hdoc-tpl-sub">by '+hdocEsc(t.confirmedBy)+'</div>':'')+'</td>'
      +'<td style="text-align:right"><button class="att-row-btn" title="Edit mail template" onclick="event.stopPropagation();hdocOpenMailEdit(\''+ty.key+'\')">'+HDOC_ICO.edit+'</button></td></tr>';
  }).join('');
  const pending=HDOC_TYPES.filter(function(ty){return !hdocMailConfirmed(ty.key);}).length;
  return hdocModalShell('Mail Templates',
    'The mail sent with each HR document: From, CC, Subject and Body. '
      +(pending?'<b>'+pending+' of '+HDOC_TYPES.length+'</b> still use placeholder wording and need HR to confirm the final values.':'All templates are confirmed by HR.'),
    '<table class="lp-table hdoc-tpl-table"><thead><tr><th>Document Type</th><th>From</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>',
    '<span></span><div class="ct-modal-btns"><button class="ep-save-btn" onclick="hdocClose()">Done</button></div>',true);
}
function hdocMailEditHTML(){
  const m=hdocModal,ty=hdocTypeOf(m.type),t=hdocMailTpl(m.type);
  const tpl=hdocActiveTemplate(m.type);
  const docVars=tpl?hdocFormKeys(tpl).filter(function(k){return k!=='employee_name'&&k!=='candidate_name';}).map(function(k){return {k:k,label:hdocFieldDef(k).label};}):[];
  const chip=function(v){return '<button type="button" class="hdoc-ins" onmousedown="event.preventDefault()" onclick="hdocMailInsert(\''+v.k+'\')" title="Insert {{'+v.k+'}}">'+hdocEsc(v.label)+'</button>';};
  const meta=t.status==='Confirmed'
    ?'Confirmed by <b>'+hdocEsc(t.confirmedBy)+'</b> on '+hdocEsc(String(t.confirmedAt).split(' | ')[0])+'. Saving a change sends it back for confirmation.'
    :'Placeholder values. HR provides the final From, CC, Subject and Body, then confirms them here.';
  const foc=' onfocus="hdocMailLastFocus=this.id"';
  hdocMailLastFocus='hdm-body';
  return hdocModalShell('Mail Template — '+ty.label,
    '<span class="hdoc-final-meta">'+hdocMailBadge(t)+'<span class="hdoc-fm-item">'+meta+'</span></span>',
    '<div class="ep-form-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label" for="hdm-from">From Email Address <span class="req">*</span></label>'
        +'<input class="ep-form-input" id="hdm-from" type="email" value="'+attrSafe(t.from)+'" placeholder="hr@company.com"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label" for="hdm-cc">CC Email Address</label>'
        +'<input class="ep-form-input" id="hdm-cc" value="'+attrSafe(t.cc)+'" placeholder="Optional · separate several with commas"></div>'
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="hdm-subject">Email Subject <span class="req">*</span></label>'
        +'<input class="ep-form-input" id="hdm-subject" value="'+attrSafe(t.subject)+'"'+foc+'></div>'
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="hdm-body">Email Body <span class="req">*</span></label>'
        +'<textarea class="ep-form-input hdoc-tpl-body hdoc-mail-body" id="hdm-body"'+foc+'>'+hdocEsc(t.body)+'</textarea>'
        +'<div class="hdoc-ins-row"><span class="hdoc-ins-lbl">Insert</span>'+HDOC_MAIL_VARS.map(chip).join('')+'</div>'
        +(docVars.length?'<div class="hdoc-ins-row"><span class="hdoc-ins-lbl">From the document</span>'+docVars.map(chip).join('')+'</div>':'')
        +'<p class="hdoc-send-hint">The generated '+ty.label+' is attached to every mail automatically.</p></div>'
    +'</div>',
    (m.back?'<button class="ep-cancel-btn" onclick="hdocOpenMailList()">'+HDOC_ICO.back+' All Mail Templates</button>':'<span></span>')
    +'<div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="'+(m.back?'hdocOpenMailList()':'hdocClose()')+'">Cancel</button>'
      +'<button class="ep-cancel-btn" onclick="hdocSaveMailTpl(false)">Save</button>'
      +'<button class="ep-save-btn" onclick="hdocSaveMailTpl(true)">'+(t.status==='Confirmed'?'Save &amp; Keep Confirmed':'Save &amp; Confirm')+'</button>'
    +'</div>',true,m.back?'hdocOpenMailList()':null);
}

/* ── Send in Mail ── */
let hdocSend=null;   // the mail being composed while the dialog is open
const HDOC_CANDIDATE_TYPES=['offer','appointment','internship'];
function hdocSendPrefill(m){
  const name=m.values.employee_name;
  const emp=name?hdocEmp(name):null;
  if(emp&&emp.email)return {email:emp.email,fromRecord:true};
  return {email:'',fromRecord:false};
}
function hdocOpenSend(){
  hdocSync();
  const m=hdocModal;if(!m)return;
  // Only a submitted document goes out - never a draft or one still being created.
  const doc=m.docId?hdocDocs.find(function(x){return x.id===m.docId;}):null;
  if(!doc||doc.status!=='Submitted'){showToast('Submit the document first','error','Send in Mail is available once the document is submitted.');return;}
  const tpl=hdocTemplateById(m.templateId);
  const miss=hdocMissing(tpl,m.values);
  if(miss.length){
    showToast('Complete the document first','error',miss.length===1?miss[0]+' is required before it can be sent.':miss.length+' fields are still empty — first: '+miss[0]+'.');
    if(m.view!=='form'){m.view='form';renderADTPage();}
    return;
  }
  const mt=hdocMailTpl(doc.type);
  const pre=hdocSendPrefill(m);
  hdocSend={email:pre.email,fromRecord:pre.fromRecord,
    candidate:!pre.fromRecord&&HDOC_CANDIDATE_TYPES.indexOf(m.type)>=0,
    from:mt.from,cc:mt.cc,subject:hdocMailFill(mt.subject,doc),body:hdocMailFill(mt.body,doc),
    attachment:hdocAttachName(doc),confirmed:mt.status==='Confirmed'};
  renderADTPage();
  const el=document.getElementById('hdoc-send-to');
  if(el&&!el.value)el.focus();
}
function hdocCloseSend(){hdocSugClose();hdocSend=null;renderADTPage();}
function hdocSendInput(el){
  el.classList.remove('is-bad');
  const e=document.getElementById('hdoc-send-err');if(e)e.hidden=true;
  if(el.id==='hdoc-send-to'||el.id==='hdoc-send-cc')hdocSuggest(el);
}
function hdocSendKey(ev){
  if(hdocSugKey(ev))return;
  if(ev.key==='Enter'&&ev.target.id==='hdoc-send-to'){ev.preventDefault();hdocSendMail();}
}

/* ── Employee type-ahead on To and CC ──
   Typing in To or CC drops down matching employees (name, email, ID,
   department). To takes the whole field; CC matches only the address being
   typed after the last comma and appends the pick to the list. Free-typed
   addresses still work - the list is a shortcut, not a restriction. */
const HDOC_SUG_MAX=6;
let hdocSugHits=[],hdocSugIdx=0,hdocSugFor=null;
function hdocSugMark(v,q){
  const s=String(v==null?'':v),i=q?s.toLowerCase().indexOf(q):-1;
  if(i<0)return hdocEsc(s);
  return hdocEsc(s.slice(0,i))+'<mark>'+hdocEsc(s.slice(i,i+q.length))+'</mark>'+hdocEsc(s.slice(i+q.length));
}
function hdocSugQuery(el){
  return (el.id==='hdoc-send-cc'?el.value.split(/[,;]/).pop():el.value).trim().toLowerCase();
}
function hdocSuggest(el){
  const q=hdocSugQuery(el);
  if(!q){hdocSugClose();return;}
  // Addresses already in To / CC are not offered again.
  const used=hdocSplitEmails((document.getElementById('hdoc-send-to')||{}).value+','+(document.getElementById('hdoc-send-cc')||{}).value)
    .map(function(x){return x.toLowerCase();});
  const all=hdocEmployees().filter(function(e){
    if(!e.email||used.indexOf(e.email.toLowerCase())>=0)return false;
    return [e.name,e.email,e.empId,e.department,e.designation].some(function(f){return f&&String(f).toLowerCase().indexOf(q)>=0;});
  });
  // Name matches first - that is what most people type.
  all.sort(function(x,y){return (y.name.toLowerCase().indexOf(q)>=0?1:0)-(x.name.toLowerCase().indexOf(q)>=0?1:0);});
  hdocSugHits=all.slice(0,HDOC_SUG_MAX);hdocSugIdx=0;hdocSugFor=el.id;
  let pop=document.getElementById('hdoc-suggest');
  if(!pop){
    pop=document.createElement('div');pop.id='hdoc-suggest';pop.className='ax-suggest hdoc-suggest';pop.setAttribute('role','listbox');
    document.body.appendChild(pop);
  }
  pop.innerHTML=hdocSugHits.length
    ?hdocSugHits.map(function(e,i){
        return '<button type="button" role="option" class="ax-sug-row'+(i===0?' is-on':'')+'" data-i="'+i+'"'
          +' onmousedown="event.preventDefault()" onmouseenter="hdocSugHover('+i+')" onclick="hdocSugPick('+i+')">'
          +'<span class="hdoc-sug-av">'+hdocEsc(hdocInitials(e.name))+'</span>'
          +'<span class="ax-sug-main"><span class="ax-sug-name">'+hdocSugMark(e.name,q)+'</span>'
          +'<span class="ax-sug-sub">'+hdocSugMark(e.email,q)+'</span></span>'
          +'<span class="ax-sug-side"><span class="ax-sug-who">'+hdocSugMark(e.department||e.designation||'',q)+'</span></span>'
        +'</button>';
      }).join('')
      +'<div class="ax-sug-foot">'+(all.length>HDOC_SUG_MAX?'Top '+HDOC_SUG_MAX+' of '+all.length+' employees':all.length+' employee'+(all.length===1?'':'s'))
        +'<span><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Enter</kbd> add</span></div>'
    :'<div class="ax-sug-none">No employees match “'+hdocEsc(q)+'”</div>';
  /* The list stays inside the Send dialog: at least 360px where the dialog
     has room, but never past its side padding - the CC field sits at the
     right edge, so a wide list is shifted left to fit. */
  const r=el.getBoundingClientRect();
  const dlg=el.closest('.hdoc-send'),d=dlg?dlg.getBoundingClientRect():{left:12,right:window.innerWidth-12,bottom:window.innerHeight-12};
  const minX=d.left+24,maxX=d.right-24;
  const w=Math.min(Math.max(r.width,360),maxX-minX);
  pop.style.left=Math.max(minX,Math.min(r.left,maxX-w))+'px';
  pop.style.width=w+'px';
  // Below the field; above it when the list would run past the dialog's bottom.
  const h=pop.offsetHeight;
  pop.style.top=(r.bottom+6+h>d.bottom-8&&r.top-6-h>8?r.top-6-h:r.bottom+6)+'px';
  el.setAttribute('aria-expanded','true');
}
function hdocInitials(n){return String(n||'').split(/\s+/).filter(Boolean).slice(0,2).map(function(p){return p[0].toUpperCase();}).join('');}
function hdocSugClose(){
  const pop=document.getElementById('hdoc-suggest');if(pop)pop.remove();
  const el=hdocSugFor&&document.getElementById(hdocSugFor);if(el)el.setAttribute('aria-expanded','false');
  hdocSugHits=[];hdocSugFor=null;
}
function hdocSugHover(i){
  hdocSugIdx=i;
  document.querySelectorAll('#hdoc-suggest .ax-sug-row').forEach(function(r){r.classList.toggle('is-on',+r.dataset.i===i);});
}
function hdocSugPick(i){
  const e=hdocSugHits[i],el=hdocSugFor&&document.getElementById(hdocSugFor);if(!e||!el)return;
  if(el.id==='hdoc-send-cc'){
    const parts=el.value.split(/[,;]/);parts.pop();
    el.value=parts.map(function(x){return x.trim();}).filter(Boolean).concat(e.email).join(', ')+', ';
  }else el.value=e.email;
  hdocSugClose();
  el.classList.remove('is-bad');
  el.focus();el.setSelectionRange(el.value.length,el.value.length);
}
/* Up / Down move the highlight, Enter picks it, Escape closes the list.
   Returns true when the key was the list's, so the field ignores it. */
function hdocSugKey(ev){
  if(!document.getElementById('hdoc-suggest')||hdocSugFor!==ev.target.id)return false;
  if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){
    ev.preventDefault();
    if(hdocSugHits.length)hdocSugHover((hdocSugIdx+(ev.key==='ArrowDown'?1:-1)+hdocSugHits.length)%hdocSugHits.length);
    return true;
  }
  if(ev.key==='Enter'&&hdocSugHits.length){ev.preventDefault();hdocSugPick(hdocSugIdx);return true;}
  if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();hdocSugClose();return true;}
  return false;
}
window.addEventListener('resize',function(){hdocSugClose();});
function hdocSendMail(){
  const val=function(id){const el=document.getElementById(id);return el?el.value.trim():'';};
  const to=val('hdoc-send-to'),cc=val('hdoc-send-cc'),subject=val('hdoc-send-subject'),body=val('hdoc-send-body');
  const err=document.getElementById('hdoc-send-err');
  const bad=function(id,msg){if(err){err.textContent=msg;err.hidden=false;}const el=document.getElementById(id);if(el){el.classList.add('is-bad');el.focus();}};
  if(!to)return bad('hdoc-send-to','Email Address is required.');
  if(!HDOC_EMAIL_RE.test(to))return bad('hdoc-send-to','Enter a valid email address, e.g. name@company.com.');
  const badCc=hdocSplitEmails(cc).filter(function(x){return !HDOC_EMAIL_RE.test(x);});
  if(badCc.length)return bad('hdoc-send-cc',badCc[0]+' is not a valid CC address.');
  if(!subject)return bad('hdoc-send-subject','Subject is required.');
  if(!body)return bad('hdoc-send-body','Message is required.');
  const m=hdocModal;
  const d=m.docId?hdocDocs.find(function(x){return x.id===m.docId;}):null;
  if(!d||d.status!=='Submitted')return;
  const now=hdocStampNow();
  // Every send is kept on the document, newest first.
  (d.mails=d.mails||[]).unshift({from:hdocSend.from,to:to,cc:cc,subject:subject,body:body,attachment:hdocSend.attachment,
    sentAt:now,sentBy:CURRENT_USER,confirmedTpl:hdocSend.confirmed});
  d.sentTo=to;d.sentAt=now;d.sentBy=CURRENT_USER;
  hdocSugClose();hdocSend=null;
  hdocModal={view:'final',type:d.type,templateId:d.templateId,docId:d.id,values:Object.assign({},d.values)};
  renderADTPage();
  showToast('Sent in mail','success',d.no+' · '+hdocTypeOf(d.type).label+' sent to '+to+(cc?' (CC '+cc+')':'')+'.');
}
function hdocSendHTML(){
  if(!hdocSend||!hdocModal)return '';
  const s=hdocSend;
  const t=hdocTypeOf(hdocModal.type);
  const d=hdocModal.docId?hdocDocs.find(function(x){return x.id===hdocModal.docId;}):null;
  const who=hdocSubject({values:hdocModal.values});
  const label=s.candidate?'Candidate Email Address':'To Email Address';
  const hint=s.fromRecord?'Fetched from '+hdocEsc(who)+'’s employee record — you can change it.'
    :s.candidate?'This person is not an employee yet, so enter the candidate’s email address.'
    :'No email is on record for this person — enter it here.';
  return '<div class="hdoc-send-ov" onclick="hdocCloseSend()">'
    +'<div class="hdoc-send hdoc-send-wide" role="dialog" aria-modal="true" aria-labelledby="hdoc-send-title" onclick="event.stopPropagation()">'
      +'<div class="hdoc-send-head"><span class="hdoc-send-ico">'+HDOC_ICO.mail+'</span>'
        +'<div><h3 id="hdoc-send-title">Send in Mail</h3>'
        +'<p>'+hdocEsc(t.label)+(who?' for '+hdocEsc(who):'')+(d&&d.no?' · '+hdocEsc(d.no):'')+'</p></div>'
        +'<button class="hdoc-send-x" onclick="hdocCloseSend()" title="Close" aria-label="Close">'+HDOC_ICO.x+'</button></div>'
      /* Header and footer stay put; only the mail between them scrolls. Each
         field is its own group, so label, control and hint keep one rhythm. */
      +'<div class="hdoc-send-scroll" onscroll="hdocSugClose()">'
        +(s.confirmed||!HDOC_MAIL_TPL_UI?'':'<div class="hdoc-send-warn">'+HDOC_ICO.alert+'<span>The '+hdocEsc(t.label)+' mail template still has placeholder wording awaiting HR confirmation. Review the mail before sending.</span></div>')
        +'<div class="hdoc-sf"><span class="ep-form-label">From</span><div class="hdoc-send-from">'+hdocEsc(s.from)+'</div></div>'
        +'<div class="hdoc-sf-row">'
          +'<div class="hdoc-sf"><label class="ep-form-label" for="hdoc-send-to">'+label+' <span class="req">*</span></label>'
            +'<input class="ep-form-input" id="hdoc-send-to" type="email" autocomplete="off" placeholder="Search employee or type email"'
              +' role="combobox" aria-autocomplete="list" aria-expanded="false"'
              +' value="'+attrSafe(s.email)+'" oninput="hdocSendInput(this)" onkeydown="hdocSendKey(event)" onblur="hdocSugClose()"></div>'
          +'<div class="hdoc-sf"><label class="ep-form-label" for="hdoc-send-cc">CC</label>'
            +'<input class="ep-form-input" id="hdoc-send-cc" autocomplete="off" value="'+attrSafe(s.cc)+'" placeholder="Search employees, comma separated"'
              +' role="combobox" aria-autocomplete="list" aria-expanded="false"'
              +' oninput="hdocSendInput(this)" onkeydown="hdocSendKey(event)" onblur="hdocSugClose()"></div>'
          +'<p class="hdoc-send-hint">'+hint+'</p>'
        +'</div>'
        +'<div class="hdoc-sf"><label class="ep-form-label" for="hdoc-send-subject">Subject <span class="req">*</span></label>'
          +'<input class="ep-form-input" id="hdoc-send-subject" value="'+attrSafe(s.subject)+'" oninput="hdocSendInput(this)"></div>'
        +'<div class="hdoc-sf"><label class="ep-form-label" for="hdoc-send-body">Message <span class="req">*</span></label>'
          +'<textarea class="ep-form-input hdoc-send-msg" id="hdoc-send-body" oninput="hdocSendInput(this)">'+hdocEsc(s.body)+'</textarea></div>'
        +'<div class="hdoc-sf"><span class="ep-form-label">Attachment</span>'
          +'<div class="hdoc-send-att">'+HDOC_ICO.doc+'<span class="hdoc-send-att-name">'+hdocEsc(s.attachment)+'</span><span class="hdoc-send-att-tag">Attached</span></div></div>'
        +'<p class="hdoc-send-err" id="hdoc-send-err" role="alert" hidden></p>'
      +'</div>'
      +'<div class="hdoc-send-btns">'
        +'<button class="ep-cancel-btn" onclick="hdocCloseSend()">Cancel</button>'
        +'<button class="ep-save-btn" onclick="hdocSendMail()">'+HDOC_ICO.send+' Send</button>'
      +'</div>'
    +'</div></div>';
}

function hdocDeleteDraft(id,ev){
  if(ev)ev.stopPropagation();
  const i=hdocDocs.findIndex(function(x){return x.id===id&&x.status==='Draft';});if(i<0)return;
  const d=hdocDocs[i];
  if(!confirm('Delete this draft '+hdocTypeOf(d.type).label+(hdocSubject(d)?' for '+hdocSubject(d):'')+'? This cannot be undone.'))return;
  hdocDocs.splice(i,1);renderADTPage();
  showToast('Draft deleted','info');
}

/* ══ TEMPLATES (Super Admin only) ══════════════════════════════════════════ */
function hdocOpenTemplates(type,ev){
  if(ev)ev.stopPropagation();
  if(!hdocTplUI())return;
  hdocModal={view:'templates',type:type};renderADTPage();
}
/* FR-22.1: one Active Template per type. Making one Active retires the one
   that was, in the same move, so there is never a moment with two. */
function hdocSetActive(id){
  if(!hdocIsAdmin())return;
  const t=hdocTemplateById(id);if(!t)return;
  hdocTemplates.forEach(function(x){if(x.type===t.type)x.status=x.id===id?'Active':'Inactive';});
  t.updatedBy=CURRENT_USER;t.updatedAt=stampNow().date;
  renderADTPage();
  showToast('Active template changed','success','"'+t.name+'" is now used for every new '+hdocTypeOf(t.type).label+'.');
}
function hdocEditTemplate(type,id){
  if(!hdocIsAdmin())return;
  hdocModal={view:'tpl-edit',type:type,tplId:id||null};renderADTPage();
}
/* Live list of the fields the template being edited will ask HR for, so the
   Super Admin sees the form they are designing while writing the letter. */
function hdocTplFieldsHTML(heading,body){
  const keys=hdocFormKeys({heading:heading,body:body});
  if(!keys.length)return '<span class="hdoc-chip-empty">No fields yet — insert one below.</span>';
  return keys.map(function(k){
    const f=hdocFieldDef(k);
    const kind=f.type==='auto'?'Auto':f.type==='employee'?'Employee':f.type==='signatory'?'Signatory':HDOC_FIELDS[k]?'Entered':'Text (custom)';
    return '<span class="hdoc-fchip'+(f.type==='auto'?' is-auto':'')+'" title="'+attrSafe(kind)+'">'+hdocEsc(f.label)+'</span>';
  }).join('');
}
function hdocTplLive(){
  const h=document.getElementById('hdt-heading'),b=document.getElementById('hdt-body');
  const box=document.getElementById('hdt-fields');
  if(box)box.innerHTML=hdocTplFieldsHTML(h?h.value:'',b?b.value:'');
}
function hdocInsertField(key){
  const b=document.getElementById('hdt-body');if(!b)return;
  const tok='{{'+key+'}}';
  const s=b.selectionStart||b.value.length,e=b.selectionEnd||s;
  b.value=b.value.slice(0,s)+tok+b.value.slice(e);
  b.focus();b.selectionStart=b.selectionEnd=s+tok.length;
  hdocTplLive();
}
function hdocSaveTemplate(){
  if(!hdocIsAdmin())return;
  const m=hdocModal;
  const name=(document.getElementById('hdt-name')||{}).value||'';
  const heading=(document.getElementById('hdt-heading')||{}).value||'';
  const body=(document.getElementById('hdt-body')||{}).value||'';
  const makeActive=!!(document.getElementById('hdt-active')||{}).checked;
  if(!name.trim()){showToast('Template Name is required','error');return;}
  if(!body.trim()){showToast('The template body is empty','error');return;}
  if(hdocTemplates.some(function(t){return t.type===m.type&&t.id!==m.tplId&&t.name.toLowerCase()===name.trim().toLowerCase();})){
    showToast('A template with that name exists','error','Give this one its own name.');return;}
  const bad=(body+heading).match(/\{\{(?!\s*[a-z0-9_]+\s*\}\})[^}]*\}\}/);
  if(bad){showToast('Check the placeholder '+bad[0],'error','Use lowercase letters, numbers and underscores, e.g. {{employee_name}}.');return;}
  let t=m.tplId?hdocTemplateById(m.tplId):null;
  if(t){t.name=name.trim();t.heading=heading.trim();t.body=body;}
  else{
    t={id:hdocTplNextId++,type:m.type,name:name.trim(),heading:heading.trim(),body:body,status:'Inactive'};
    hdocTemplates.push(t);
  }
  t.updatedBy=CURRENT_USER;t.updatedAt=stampNow().date;
  if(makeActive||!hdocActiveTemplate(m.type))hdocTemplates.forEach(function(x){if(x.type===t.type)x.status=x.id===t.id?'Active':'Inactive';});
  hdocModal={view:'templates',type:m.type};
  renderADTPage();
  showToast('Template saved','success','"'+t.name+'"'+(t.status==='Active'?' is the Active Template.':' saved as Inactive.'));
}

/* ══ RENDERING ═════════════════════════════════════════════════════════════ */
const HDOC_ICO={
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  award:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="6"/><path d="M15.48 12.89L17 22l-5-3-5 3 1.52-9.11"/></svg>',
  exit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  cap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/></svg>',
  sign:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  trend:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  calX:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="10" y1="14" x2="14" y2="18"/><line x1="14" y1="14" x2="10" y2="18"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  plus:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  back:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
  x:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  chevR:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6"/></svg>',
  chev:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>',
  edit:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  eye:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  send:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  dl:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  cog:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.17 14H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9.83 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.83 9H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
};
const HDOC_TYPE_ICON={experience:'award',relieving:'exit',internship:'cap',offer:'mail',appointment:'sign',
  increment:'trend',confirmation:'check','warn-leave':'calX','warn-perf':'alert'};

/* ══ LAYOUT ═══════════════════════════════════════════════════════════════
   WHAT THE PAGE IS FOR decides its shape. HR comes here to do one of three
   things: start a letter, pick up a draft, or find one already issued. So:

     main column   the nine document types, as one catalogue grouped by the
                   stage of employment they belong to - the order HR thinks
                   in ("someone is leaving: experience, relieving") rather
                   than an alphabet or a grid of look-alike tiles.
     side rail     Saved Drafts first - unfinished work is what most needs
                   picking up - then the documents issued most recently.

   A type's own screen keeps the same two columns: its issued documents in
   the main column, its drafts in the rail. Same places, same meaning, on
   both screens. */
/* Each group carries one of the app's status tones, so its letters are told
   apart at a glance by colour as well as by heading: blue for people coming
   in, green while they are here, slate as they leave, red for discipline -
   the same meanings those tones have everywhere else in the product. */
const HDOC_GROUPS=[
  {label:'Hiring & Joining', tone:'info',hint:'For candidates and new joiners', keys:['offer','appointment','internship']},
  {label:'During Employment',tone:'ok',  hint:'Milestones while in service',    keys:['confirmation','increment']},
  {label:'Exit',             tone:'idle',hint:'When an employee leaves',        keys:['experience','relieving']},
  {label:'Disciplinary',     tone:'bad', hint:'Formal warnings',                keys:['warn-leave','warn-perf']}
];
function hdocGroupOf(key){return HDOC_GROUPS.find(function(g){return g.keys.indexOf(key)>=0;})||HDOC_GROUPS[0];}
/* "Updated 2 days ago" is what someone scanning their drafts wants; the
   exact date is on the row's tooltip. */
function hdocAgo(stamp){
  const p=String(stamp||'').split(' | ')[0].split(' ');
  const mi=CD_MON_SHORT.indexOf(p[1]);
  if(p.length<3||mi<0)return p.join(' ');
  const d=new Date(+p[2],mi,+p[0]),t=new Date();t.setHours(0,0,0,0);
  const n=Math.round((t-d)/86400000);
  if(n<=0)return 'today';
  if(n===1)return 'yesterday';
  if(n<7)return n+' days ago';
  return p.join(' ');
}
function hdocInitials(name){
  const w=String(name||'').trim().split(/\s+/).filter(Boolean);
  return w.length?(w[0][0]+(w.length>1?w[w.length-1][0]:'')).toUpperCase():'?';
}
/* One item in the rail - a draft or an issued document. */
function hdocItemHTML(d,mode){
  const who=hdocSubject(d);
  const t=hdocTypeOf(d.type);
  const sub=mode==='issued'
    ?d.no+' · '+t.label
    :(mode==='type'?'Started by '+hdocEsc(d.createdBy):t.label);
  return '<div class="hdoc-item" role="button" tabindex="0" onclick="hdocOpenDoc('+d.id+')" '
    +'onkeydown="if(event.key===\'Enter\')hdocOpenDoc('+d.id+')" title="'+attrSafe((mode==='issued'?'Issued ':'Last updated ')+d.updatedAt)+'">'
    +'<span class="hdoc-av'+(mode==='issued'?' is-issued':'')+'">'+hdocInitials(who)+'</span>'
    +'<span class="hdoc-item-txt"><span class="hdoc-item-name">'+(who?hdocEsc(who):'<i>Untitled draft</i>')+'</span>'
      +'<span class="hdoc-item-sub">'+sub+'</span></span>'
    +(mode==='issued'
      ?'<span class="hdoc-item-go">'+HDOC_ICO.chevR+'</span>'
      :'<span class="hdoc-item-age">'+hdocAgo(d.updatedAt)+'</span>'+'<button type="button" class="hdoc-item-del" title="Delete draft" aria-label="Delete draft" onclick="hdocDeleteDraft('+d.id+',event)">'+HDOC_ICO.trash+'</button>')
    +'</div>';
}
function hdocPanel(title,count,body,tone){
  return '<section class="hdoc-panel">'
    +'<div class="hdoc-panel-head"><span class="hdoc-panel-title">'+title+'</span>'
      +(count!=null?'<span class="hdoc-pill'+(tone?' is-'+tone:'')+'">'+count+'</span>':'')+'</div>'
    +body+'</section>';
}
function hdocDraftsPanel(type){
  const list=hdocDrafts(type);
  if(!list.length)return '';      // no drafts: the panel is not shown at all
  return hdocPanel('Saved Drafts',list.length,
    list.length?'<div class="hdoc-items">'+list.map(function(d){return hdocItemHTML(d,type?'type':'all');}).join('')+'</div>'
      :'<div class="hdoc-rail-empty">No drafts'+(type?' for this letter':'')+'. Use <b>Save as Draft</b> while creating a document to finish it later.</div>',
    list.length?'wait':'');
}

function buildHrDocsHTML(){
  return (hdocType?hdocTypeScreenHTML():hdocCardsHTML())+hdocModalHTML()+hdocSendHTML();
}
/* The catalogue. Each type is a row - icon, name, what it is for, how many
   exist - with Create on it, so starting a letter is one click from here
   (FR-22.2 "Create button on every card") and opening the row shows what has
   been issued. */
function hdocCardsHTML(){
  const admin=hdocIsAdmin();
  const row=function(t){
    const act=hdocActiveTemplate(t.key);
    const issued=hdocIssued(t.key).length,drafts=hdocDrafts(t.key).length;
    return '<div class="hdoc-row" role="button" tabindex="0" onclick="hdocOpenType(\''+t.key+'\')" '
      +'onkeydown="if(event.key===\'Enter\')hdocOpenType(\''+t.key+'\')">'
      +'<span class="hdoc-row-ico tone-'+hdocGroupOf(t.key).tone+'">'+HDOC_ICO[HDOC_TYPE_ICON[t.key]]+'</span>'
      +'<span class="hdoc-row-txt"><span class="hdoc-row-name">'+t.label+'</span>'
        +'<span class="hdoc-row-desc">'+(act?t.blurb:'<span class="hdoc-warn">'+(hdocTplUI()?'No Active Template — set one in Templates.':'Not available yet.')+'</span>')+'</span></span>'
      /* Drafts lead when there are any - they are work waiting on someone. */
      +'<span class="hdoc-row-stats">'
        +(drafts?'<span class="hdoc-chip is-draft">'+drafts+' draft'+(drafts===1?'':'s')+'</span>':'')
        +'<span class="hdoc-chip'+(issued?'':' is-zero')+'">'+issued+' issued</span>'
      +'</span>'
      +'<span class="hdoc-row-acts">'
        /* HR never sees a template (FR-22.1); see HDOC_TEMPLATES_UI. */
        +(hdocTplUI()?'<button type="button" class="hdoc-icon-btn" onclick="hdocOpenTemplates(\''+t.key+'\',event)" title="Templates" aria-label="Templates for '+attrSafe(t.label)+'">'+HDOC_ICO.cog+'</button>':'')
        +'<button type="button" class="ep-cancel-btn hdoc-create" onclick="hdocCreate(\''+t.key+'\',event)"'+(act?'':' disabled')+'>'+HDOC_ICO.plus+'Create</button>'
      +'</span>'
      +'</div>';
  };
  const catalogue='<section class="hdoc-panel">'
    +HDOC_GROUPS.map(function(g){
      return '<div class="hdoc-group"><div class="hdoc-group-label">'
          +'<span class="hdoc-group-dot tone-'+g.tone+'"></span><span class="hdoc-group-name">'+g.label+'</span>'
          +'<span class="hdoc-group-hint">'+g.hint+'</span></div>'
        +g.keys.map(function(k){return row(hdocTypeOf(k));}).join('')+'</div>';
    }).join('')+'</section>';
  const recent=hdocIssued().slice().sort(function(a,b){return b.id-a.id;}).slice(0,5);
  const totalIssued=hdocIssued().length,totalDrafts=hdocDrafts().length;
  return '<div class="lp-page hdoc-page">'
    +dashboardBackHTML()
    +'<header class="hdoc-head"><div><h1 class="hdoc-title">HR Docs</h1>'
      +'<p class="hdoc-sub">'+(hdocTplUI()?'Letters for employees, each made from its document type&rsquo;s Active Template.'
        :'Create, save and download letters for your employees.')+'</p></div>'
      /* The app's own listing-stats strip, read-only here: totals, not filters. */
      +'<div class="listing-stats hdoc-stats">'
        +'<div class="listing-stat"><div class="listing-stat-count">'+HDOC_TYPES.length+'</div><div class="listing-stat-label">Letter Types</div></div>'
        +'<div class="listing-stat"><div class="listing-stat-count" style="color:var(--st-ok-fg)">'+totalIssued+'</div><div class="listing-stat-label">Issued</div></div>'
        +'<div class="listing-stat"><div class="listing-stat-count" style="color:var(--st-wait-fg)">'+totalDrafts+'</div><div class="listing-stat-label">In Draft</div></div>'
      +'</div>'
      +(hdocMailUI()?'<button class="ep-cancel-btn hdoc-mail-btn" onclick="hdocOpenMailList()">'+HDOC_ICO.mail+' Mail Templates</button>':'')
    +'</header>'
    +'<div class="hdoc-layout">'
      +'<div class="hdoc-main">'+catalogue+'</div>'
      +'<aside class="hdoc-rail">'
        +hdocDraftsPanel(null)
        +hdocPanel('Recently Issued',null,recent.length
          ?'<div class="hdoc-items">'+recent.map(function(d){return hdocItemHTML(d,'issued');}).join('')+'</div>'
          :'<div class="hdoc-rail-empty">Nothing issued yet.</div>')
      +'</aside>'
    +'</div></div>';
}
/* One type's screen: what it is and how to make one, then everything issued
   from it, with its drafts in the rail. */
function hdocTypeScreenHTML(){
  const t=hdocTypeOf(hdocType);
  const act=hdocActiveTemplate(t.key);
  const all=hdocIssued(t.key);
  const rows=lpSearchRows(all.map(function(d){
    return {d:d,no:d.no,name:hdocSubject(d),by:d.createdBy,at:d.createdAt};
  }),hdocQ);
  const pgn=listPage('hr-docs-'+t.key,hdocQ,rows.map(function(r,i){
    const d=r.d;
    return '<tr class="hdoc-trow" id="hdoc-row-'+d.id+'" style="cursor:pointer" onclick="hdocOpenDoc('+d.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td style="white-space:nowrap"><span style="font-weight:600;color:var(--navy)">'+d.no+'</span></td>'
      +'<td><span class="hdoc-cell-who"><span class="hdoc-av is-issued is-sm">'+hdocInitials(r.name)+'</span>'+hdocEsc(r.name)+'</span></td>'
      +'<td>'+hdocEsc(d.createdBy)+'</td>'
      +'<td style="white-space:nowrap">'+(d.submittedAt||d.updatedAt).split(' | ')[0]+'</td>'
      +'<td><span class="lp-status-badge tone-'+statusTone('Submitted')+'">Submitted</span></td>'
      +'<td onclick="event.stopPropagation()"><button class="att-row-btn" title="Open" onclick="hdocOpenDoc('+d.id+')">'+HDOC_ICO.eye+'</button></td>'
      +'</tr>';
  }),'<tr><td colspan="7" class="hdoc-table-empty">'
      +(hdocQ?'No documents match &ldquo;'+hdocEsc(hdocQ)+'&rdquo;.'
        :'<b>No '+t.label.toLowerCase()+'s issued yet.</b><br>Documents appear here once they are submitted.')+'</td></tr>');
  return '<div class="lp-page hdoc-page">'
    +'<button class="ep-back hdoc-back" onclick="hdocBack()">'+HDOC_ICO.back+' HR Docs</button>'
    +'<header class="hdoc-head hdoc-type-head">'
      +'<span class="hdoc-row-ico is-lg tone-'+hdocGroupOf(t.key).tone+'">'+HDOC_ICO[HDOC_TYPE_ICON[t.key]]+'</span>'
      +'<div class="hdoc-type-txt"><h1 class="hdoc-title">'+t.label+'</h1>'
        +'<p class="hdoc-sub">'+t.blurb+'</p>'
        +(hdocTplUI()?'<p class="hdoc-type-tpl">'+(act?'Active template · <b>'+hdocEsc(act.name)+'</b>':'<span class="hdoc-warn">No Active Template</span>')+'</p>':'')
      +'</div>'
      +'<div class="hdoc-type-btns">'
        +(hdocTplUI()?'<button class="ep-cancel-btn" onclick="hdocOpenTemplates(\''+t.key+'\')">'+HDOC_ICO.cog+' Templates</button>':'')
        +(hdocMailUI()?'<button class="ep-cancel-btn" onclick="hdocOpenMailEdit(\''+t.key+'\')">'+HDOC_ICO.mail+' Mail Template</button>':'')
        +'<button class="ep-save-btn" onclick="hdocCreate(\''+t.key+'\')"'+(act?'':' disabled title="No Active Template"')+'>'+HDOC_ICO.plus+' Create '+t.label+'</button>'
      +'</div></header>'
    /* FR-22.1 / 22.6: Saved Drafts first, with its count, then what has been
       issued - both full width, one above the other. */
    +hdocDraftsTableHTML(t.key)
    +'<section class="hdoc-panel">'
      +'<div class="hdoc-panel-head"><span class="hdoc-panel-title">Issued Documents</span><span class="hdoc-pill">'+all.length+'</span>'
        +'<span class="hdoc-panel-search">'+lpSearchField('hdoc-q',hdocQ,'Search number or employee','hdocSearch()')
        +(hdocQ?'<button class="lp-pill-clear" onclick="hdocClearSearch()">Clear</button>':'')+'</span></div>'
      +'<table class="lp-table hdoc-table"><thead><tr><th>S. No</th><th>Document No</th><th>Employee</th><th>Created By</th>'
        +'<th>Issued On</th><th>Status</th><th>Action</th></tr></thead><tbody>'+pgn.rows+'</tbody></table>'
      +(all.length>LIST_PAGE_SIZE?pgn.pager:'')
    +'</section></div>';
}
/* FR-22.6: the type's drafts as a table - who the letter is for, its type,
   who started it, when, and the way back into it. */
function hdocDraftsTableHTML(type){
  const list=hdocDrafts(type);
  if(!list.length)return '';      // no drafts: the section is not shown at all
  const rows=list.map(function(d,i){
    const who=hdocSubject(d);
    return '<tr class="hdoc-trow" style="cursor:pointer" onclick="hdocOpenDoc('+d.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td>'+(who?'<span class="hdoc-cell-who"><span class="hdoc-av is-sm">'+hdocInitials(who)+'</span>'+hdocEsc(who)+'</span>':'<i style="color:var(--gray)">Not chosen yet</i>')+'</td>'
      +'<td>'+hdocTypeOf(d.type).label+'</td>'
      +'<td>'+hdocEsc(d.createdBy)+'</td>'
      +'<td style="white-space:nowrap">'+String(d.createdAt).split(' | ')[0]+'</td>'
      +'<td style="white-space:nowrap">'+String(d.updatedAt).split(' | ')[0]+'</td>'
      +'<td onclick="event.stopPropagation()" style="white-space:nowrap">'
        +'<button class="att-row-btn" title="Continue editing" onclick="hdocOpenDoc('+d.id+')">'+HDOC_ICO.edit+'</button>'
        +'<button class="att-row-btn is-danger" title="Delete draft" onclick="hdocDeleteDraft('+d.id+',event)">'+HDOC_ICO.trash+'</button></td>'
      +'</tr>';
  }).join('');
  return '<section class="hdoc-panel hdoc-drafts-top">'
    +'<div class="hdoc-panel-head"><span class="hdoc-panel-title">Saved Drafts</span>'
      +'<span class="hdoc-pill'+(list.length?' is-wait':'')+'">'+list.length+'</span></div>'
    +(list.length
      ?'<table class="lp-table hdoc-table"><thead><tr><th>S. No</th><th>Employee</th><th>Document Type</th><th>Created By</th>'
        +'<th>Created Date</th><th>Updated Date</th><th>Action</th></tr></thead><tbody>'+rows+'</tbody></table>'
      :'<div class="hdoc-rail-empty">No drafts for this letter. Use <b>Save as Draft</b> while creating a document to finish it later.</div>')
    +'</section>';
}

/* ── The popups ──────────────────────────────────────────────────────────── */
function hdocModalShell(title,sub,body,foot,wide,back){
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form hdoc-modal'+(wide?' hdoc-modal-wide':'')+'" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'
      +(back?'<button class="hdoc-hdr-back" onclick="'+back+'" title="Back">'+HDOC_ICO.back+'</button>':'')+title+'</span>'
      +'<button class="ct-modal-close" onclick="hdocClose()">'+HDOC_ICO.x+'</button></div>'
    +(sub?'<p class="ct-modal-sub">'+sub+'</p>':'')
    +body
    +'<div class="ct-modal-foot">'+foot+'</div>'
    +'</div></div>';
}
function hdocModalHTML(){
  const m=hdocModal;if(!m)return '';
  if(m.view==='templates')return hdocTemplatesModalHTML();
  if(m.view==='tpl-edit')return hdocTplEditModalHTML();
  if(m.view==='mail-list')return hdocMailListHTML();
  if(m.view==='mail-edit')return hdocMailEditHTML();
  const t=hdocTypeOf(m.type),tpl=hdocTemplateById(m.templateId);
  if(!t||!tpl)return '';
  const d=m.docId?hdocDocs.find(function(x){return x.id===m.docId;}):null;
  if(m.view==='form'){
    const v=hdocResolve(m.values);
    /* The Appointment Letter form asks only for what HR enters: its Auto
       fields are not shown, and still fill the letter from the employee and
       signatory picked. */
    const fields=hdocFormKeys(tpl).filter(function(k){
      return !(m.type==='appointment'&&hdocFieldDef(k).type==='auto');
    }).map(function(k){
      const f=hdocFieldDef(k),id='hdf-'+k;
      const lbl='<label class="ep-form-label" for="'+id+'">'+hdocEsc(f.label)+((f.req||f.type==='words')&&f.type!=='auto'?' <span class="req">*</span>':'')
        +(f.type==='auto'||f.type==='words'?' <span class="hdoc-auto">Auto</span>':'')+'</label>';
      let ctl='';
      if(f.type==='employee')ctl=apCS(id,hdocEmployees().map(function(e){return e.name;}),m.values[k]||'','Select Employee','hdocPickHook');
      else if(f.type==='signatory')ctl=apCS(id,HDOC_SIGNATORIES.map(function(s){return s.name;}),m.values[k]||'','Select Signatory','hdocPickHook');
      else if(f.type==='select'){
        ctl=apCS(id,hdocOpts(f),m.values[k]||'',f.search?'Search '+f.label.toLowerCase():'Select');
        if(f.search)ctl=ctl.replace('<div class="cs-wrap"','<div class="cs-wrap" data-cssearch="1"');
      }
      else if(f.type==='date')ctl=apCD(id,m.values[k]||'','dd-mm-yyyy');
      else if(f.type==='time')ctl='<input class="ep-form-input" id="'+id+'" type="time" value="'+attrSafe(m.values[k]||'')+'">';
      else if(f.type==='multi')ctl=apMS(id,hdocPayheads(f.heads),[].concat(m.values[k]||[]),'Select '+f.label.toLowerCase());
      else if(f.type==='words')ctl='<input class="ep-form-input hdoc-auto-input" id="'+id+'" readonly value="'+attrSafe(v[k]||'')+'" placeholder="Written out from the amount">';
      else if(f.type==='auto')ctl='<input class="ep-form-input hdoc-auto-input" id="'+id+'" readonly value="'+attrSafe(hdocFmt(k,v[k])||'')+'" placeholder="'
        +(f.from==='sigDesig'?'Filled from the signatory':'Filled from the employee')+'">';
      else if(f.type==='textarea')ctl='<textarea class="ep-form-input hdoc-textarea" id="'+id+'" placeholder="'+attrSafe(f.ph||'')+'">'+hdocEsc(m.values[k]||'')+'</textarea>';
      else ctl='<input class="ep-form-input" id="'+id+'" type="'+(f.type==='number'?'number':'text')+'"'+(f.type==='number'?' min="0" oninput="hdocWordsLive(this)"':'')
        +' value="'+attrSafe(m.values[k]||'')+'" placeholder="'+attrSafe(f.ph||'')+'">';
      return '<div class="ep-form-group'+(f.type==='textarea'?' ep-form-full':'')+'">'+lbl+ctl+'</div>';
    }).join('');
    const sub=(d&&d.status==='Draft'?'Continuing a saved draft. ':d&&d.status==='Submitted'?'Editing '+d.no+'. ':'')
      +(hdocTplUI()?'The fields below come from the Active Template for this document type (<b>'+hdocEsc(tpl.name)+'</b>). '
        :'Fill in the details for this document. ')+'Fields marked <span class="req">*</span> are required to submit.';
    return hdocModalShell((d&&d.status==='Submitted'?'Edit ':d?'':'Create ')+t.label,sub,
      '<div class="ep-form-grid">'+fields+'</div>',
      '<div class="ct-modal-btns">'
        +'<button class="ep-cancel-btn" onclick="hdocClose()">Cancel</button>'
        +'<button class="ep-cancel-btn" onclick="hdocSaveDraft()">Save as Draft</button>'
        +'<button class="ep-save-btn" onclick="hdocToPreview()">'+HDOC_ICO.eye+' Preview</button>'
      +'</div>',false);
  }
  const miss=hdocMissing(tpl,m.values);
  if(m.view==='preview'){
    return hdocModalShell('Preview — '+t.label,
      miss.length?'<span class="hdoc-miss-note">'+miss.length+' required field'+(miss.length===1?' is':'s are')+' still empty — marked in the document. Go back to fill '+(miss.length===1?'it':'them')+' before submitting.</span>'
        :'This is the document as it will be issued. Submit to finalise it, or save it as a draft.',
      '<div class="hdoc-paper-wrap">'+hdocRenderLetter(tpl,m.values,d&&d.no)+'</div>',
      '<div class="ct-modal-btns">'
        +'<button class="ep-cancel-btn" onclick="hdocToForm()">'+HDOC_ICO.back+' Back to Fields</button>'
        +'<button class="ep-cancel-btn" onclick="hdocSaveDraft()">Save as Draft</button>'
        +'<button class="ep-save-btn" onclick="hdocSubmit()"'+(miss.length?' disabled title="Fill every required field first"':'')+'>Submit</button>'
      +'</div>',true,'hdocToForm()');
  }
  /* final review */
  return hdocModalShell(t.label+' — '+(d?d.no:''),
    '<span class="hdoc-final-meta">'
      +'<span class="lp-status-badge tone-'+statusTone('Submitted')+'">Submitted</span>'
      +'<span class="hdoc-fm-item">Final review'+(d?' · Created by <b>'+hdocEsc(d.createdBy)+'</b> on '+d.createdAt.split(' | ')[0]:'')+'</span>'
      +(d&&d.sentTo?'<span class="hdoc-fm-sent" title="'+attrSafe('Sent by '+(d.sentBy||'')+' on '+d.sentAt+(d.mails&&d.mails[0]?' · Subject: '+d.mails[0].subject+(d.mails[0].cc?' · CC '+d.mails[0].cc:''):''))+'">'+HDOC_ICO.mail
        +'<span>Sent to <b>'+hdocEsc(d.sentTo)+'</b> · '+d.sentAt.split(' | ')[0]+'</span></span>':'')
    +'</span>',
    '<div class="hdoc-paper-wrap">'+hdocRenderLetter(tpl,m.values,d&&d.no)+'</div>',
    '<div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="hdocEditFinal()">'+HDOC_ICO.edit+' Edit</button>'
      +'<button class="ep-cancel-btn" onclick="hdocSaveDraft()">Save as Draft</button>'
      +'<button class="ep-cancel-btn" onclick="hdocOpenSend()">'+HDOC_ICO.mail+' Send in Mail</button>'
      +'<button class="ep-save-btn" onclick="hdocDownload()">'+HDOC_ICO.dl+' Download</button>'
    +'</div>',true);
}
function hdocTemplatesModalHTML(){
  const t=hdocTypeOf(hdocModal.type);
  const list=hdocTemplates.filter(function(x){return x.type===t.key;});
  const rows=list.map(function(x){
    return '<tr><td><div style="font-weight:600;color:var(--navy)">'+hdocEsc(x.name)+'</div>'
        +'<div class="hdoc-tpl-sub">'+hdocFormKeys(x).length+' fields · heading “'+hdocEsc(x.heading||'—')+'”</div></td>'
      +'<td style="white-space:nowrap">'+hdocEsc(x.updatedBy||'—')+'<div class="hdoc-tpl-sub">'+hdocEsc(x.updatedAt||'')+'</div></td>'
      +'<td><span class="lp-status-badge tone-'+statusTone(x.status)+'">'+x.status+'</span></td>'
      +'<td style="white-space:nowrap;text-align:right">'
        +(x.status==='Active'?'':'<button class="ep-cancel-btn hdoc-sm-btn" onclick="hdocSetActive('+x.id+')">Set Active</button>')
        +'<button class="att-row-btn" title="Edit template" onclick="hdocEditTemplate(\''+t.key+'\','+x.id+')">'+HDOC_ICO.edit+'</button></td></tr>';
  }).join('');
  return hdocModalShell('Templates — '+t.label,
    'Only one template can be Active at a time. Every new '+t.label+' is created from the Active one; HR never sees this list.',
    '<table class="lp-table hdoc-tpl-table"><thead><tr><th>Template</th><th>Last Updated</th><th>Status</th><th></th></tr></thead><tbody>'
      +(rows||'<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--gray)">No templates yet.</td></tr>')+'</tbody></table>',
    '<button class="ep-cancel-btn" onclick="hdocEditTemplate(\''+t.key+'\')">'+HDOC_ICO.plus+' Add Template</button>'
    +'<div class="ct-modal-btns"><button class="ep-save-btn" onclick="hdocClose()">Done</button></div>',false);
}
function hdocTplEditModalHTML(){
  const m=hdocModal,t=hdocTypeOf(m.type);
  const x=m.tplId?hdocTemplateById(m.tplId):null;
  const seed=x||hdocActiveTemplate(t.key)||{heading:t.label.toUpperCase(),body:''};
  const name=x?x.name:'';
  const heading=x?x.heading:seed.heading;
  const body=x?x.body:seed.body;
  const chips=Object.keys(HDOC_FIELDS).map(function(k){
    return '<button type="button" class="hdoc-ins" onclick="hdocInsertField(\''+k+'\')" title="Insert {{'+k+'}}">'+hdocEsc(HDOC_FIELDS[k].label)+'</button>';
  }).join('')+'<button type="button" class="hdoc-ins" onclick="hdocInsertField(\'company_name\')" title="Insert {{company_name}}">Company Name</button>';
  return hdocModalShell((x?'Edit Template':'Add Template')+' — '+t.label,
    'Write the letter with <code>{{placeholders}}</code>. The placeholders you use become the fields HR fills in.'
      +(x?'':' A new template starts from the current Active one.'),
    '<div class="ep-form-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label" for="hdt-name">Template Name <span class="req">*</span></label>'
        +'<input class="ep-form-input" id="hdt-name" value="'+attrSafe(name)+'" placeholder="e.g. '+attrSafe(t.label)+' - 2027 format"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label" for="hdt-heading">Document Heading</label>'
        +'<input class="ep-form-input" id="hdt-heading" value="'+attrSafe(heading)+'" oninput="hdocTplLive()"></div>'
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="hdt-body">Letter Body <span class="req">*</span></label>'
        +'<textarea class="ep-form-input hdoc-tpl-body" id="hdt-body" oninput="hdocTplLive()">'+hdocEsc(body)+'</textarea>'
        +'<div class="hdoc-ins-row"><span class="hdoc-ins-lbl">Insert field</span>'+chips+'</div></div>'
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Fields HR will fill in</label>'
        +'<div class="hdoc-fchips" id="hdt-fields">'+hdocTplFieldsHTML(heading,body)+'</div></div>'
      +'<div class="ep-form-group ep-form-full"><label class="hdoc-check"><input type="checkbox" id="hdt-active"'
        +(x&&x.status==='Active'?' checked disabled':'')+'><span>Make this the Active Template for '+t.label+'</span></label></div>'
    +'</div>',
    '<button class="ep-cancel-btn" onclick="hdocOpenTemplates(\''+t.key+'\')">'+HDOC_ICO.back+' Back to Templates</button>'
    +'<div class="ct-modal-btns"><button class="ep-save-btn" onclick="hdocSaveTemplate()">Save Template</button></div>',true);
}

/* Page title - getPageMeta() falls back to supportPageMeta. */
supportPageMeta['hr-docs']={title:'HR Docs',context:'HR Docs',filters:[],columns:[],rows:[]};
