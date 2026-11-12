/* ══ PAY RUNS + PAYMENTS: CREATE FORMS ═══════════════════════════════════════
   Both listings had a + in the topbar that created nothing a user could shape:
   Payments fired a "draft invoice generated" toast and added no row, and Pay
   Runs went through addDemoMetaRow(), which invented a placeholder row whose
   detail panel was empty. Each now opens a real create form in the shared
   .ct-modal popup (.ct-modal--form, the one creation width), and the record it
   writes carries every field its detail panel reads - so opening the new row
   shows what was entered, not blanks.

   Loaded after pages.js: it uses customSelect, apCD, showToast and lpLanded*,
   and the two listing builders read prCreateOpen / pmCreateOpen from here. */

const PAY_X_SVG='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

/* Country decides the entity and the currency, so the form asks for the
   country and derives the other two rather than letting them disagree. */
const PAY_COUNTRIES={
  'Netherlands':{entity:'Dhi Hyperlocal BV',currency:'EUR',code:'NL',method:'SEPA Bank Transfer'},
  'Germany':{entity:'Dhi Hyperlocal GmbH',currency:'EUR',code:'DE',method:'SEPA Bank Transfer'},
  'Spain':{entity:'Dhi Hyperlocal SL',currency:'EUR',code:'ES',method:'SEPA Bank Transfer'},
  'Belgium':{entity:'Dhi Hyperlocal BV',currency:'EUR',code:'BE',method:'SEPA Bank Transfer'},
  'India':{entity:'Dhi Hyperlocal Pvt Ltd',currency:'INR',code:'IN',method:'NEFT Bank Transfer'},
  'United Kingdom':{entity:'Dhi Hyperlocal Ltd',currency:'GBP',code:'UK',method:'BACS Bank Transfer'},
  'USA':{entity:'Dhi Hyperlocal Inc',currency:'USD',code:'US',method:'ACH Bank Transfer'}
};
const PAY_COUNTRY_LIST=Object.keys(PAY_COUNTRIES);
const PAY_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];

/* Money shown the way the listings already show it: "EUR 184,200". */
function payMoney(cur,n){return cur+' '+Number(n).toLocaleString('en-US',{maximumFractionDigits:2});}
/* "1 Jun 2026" from the date picker, padded to the "01 Jun 2026" the rest of
   the records use. */
function payDateLabel(iso){const l=cdLabel(iso);return l&&l.length===10?'0'+l:l;}
function payFlash(msg){showToast(msg,'error');}

/* ── Pay Run ─────────────────────────────────────────────────────────────── */
let prCreateOpen=false;
function startAddPayRun(){prCreateOpen=true;renderADTPage();}
function cancelAddPayRun(){prCreateOpen=false;renderADTPage();}

/* The current month and the five after it: a pay run is set up ahead of the
   cycle it pays, never for one long closed. */
function prCycleOptions(){
  const now=new Date(),out=[];
  for(let i=0;i<6;i++){const d=new Date(now.getFullYear(),now.getMonth()+i,1);out.push(PAY_MONTHS[d.getMonth()]+' '+d.getFullYear());}
  return out;
}

function buildCreatePayRunModalHTML(){
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form" role="dialog" aria-modal="true" aria-label="Create Pay Run" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create Pay Run</span>'
      +'<button class="ct-modal-close" onclick="cancelAddPayRun()" aria-label="Close">'+PAY_X_SVG+'</button></div>'
    +'<p class="ct-modal-sub">The cycle, where it runs and what it pays. Entity and currency follow the country.</p>'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Pay Cycle <span class="req">*</span></label>'
      +customSelect('pr-new-cycle','',prCycleOptions(),'Select Cycle')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Country <span class="req">*</span></label>'
      +customSelect('pr-new-country','',PAY_COUNTRY_LIST,'Select Country')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Frequency <span class="req">*</span></label>'
      +customSelect('pr-new-freq','Monthly',['Monthly','Semi-monthly','Bi-weekly','Weekly'],'Select Frequency')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employees <span class="req">*</span></label>'
      +'<input type="number" min="1" step="1" class="ep-form-input" id="pr-new-emps" placeholder="e.g. 40"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Cut-off Date <span class="req">*</span></label>'
      +apCD('pr-new-cutoff','','Select date')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Pay Date <span class="req">*</span></label>'
      +apCD('pr-new-paydate','','Select date')+'</div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Estimated Gross Pay <span class="req">*</span></label>'
      +'<input type="number" min="0" step="0.01" class="ep-form-input" id="pr-new-gross" placeholder="Amount in the country\'s currency"></div>'
    +'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="cancelAddPayRun()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="submitAddPayRun()">Create Pay Run</button>'
    +'</div></div>'
    +'</div></div>';
}

function submitAddPayRun(){
  const cycle=getCustomSelectValue('pr-new-cycle');
  const country=getCustomSelectValue('pr-new-country');
  const freq=getCustomSelectValue('pr-new-freq')||'Monthly';
  const emps=parseInt((document.getElementById('pr-new-emps')||{}).value,10);
  const cutIso=getCDValue('pr-new-cutoff'),payIso=getCDValue('pr-new-paydate');
  const gross=parseFloat((document.getElementById('pr-new-gross')||{}).value);
  if(!cycle)return payFlash('Please select a Pay Cycle');
  if(!country)return payFlash('Please select a Country');
  if(!(emps>0))return payFlash('Please enter the number of Employees');
  if(!cutIso)return payFlash('Please select a Cut-off Date');
  if(!payIso)return payFlash('Please select a Pay Date');
  if(payIso<cutIso)return payFlash('Pay Date cannot be before the Cut-off Date');
  if(!(gross>=0)||isNaN(gross))return payFlash('Please enter the Estimated Gross Pay');

  const c=PAY_COUNTRIES[country];
  const parts=cycle.split(' '),mi=PAY_MONTHS.indexOf(parts[0]),yr=parseInt(parts[1],10);
  const last=new Date(yr,mi+1,0).getDate(),mon=parts[0].slice(0,3);
  const meta=getPageMeta('payroll');
  /* Rows are keyed by their first cell, and payrollRecords by the same number,
     so a new run takes the next free id and goes on the END - renumbering the
     rows (what addDemoMetaRow did) would point every existing row at the wrong
     record. */
  const id=meta.rows.reduce(function(m,r){return Math.max(m,Number(r[0])||0);},0)+1;
  const grossTxt=payMoney(c.currency,gross);
  payrollRecords[id]={id:id,cycle:cycle,period:'01 '+mon+' '+yr+' - '+last+' '+mon+' '+yr,
    country:country,entity:c.entity,currency:c.currency,employees:emps,
    grossPay:grossTxt,deductions:'-',employerCost:'-',netPayable:'-',totalCost:'-',
    payDate:payDateLabel(payIso),cutOff:payDateLabel(cutIso),payMethod:c.method,frequency:freq,
    owner:CURRENT_USER,approver:'-',approvedOn:'-',status:'Pending',
    payrollId:'PR-'+yr+'-'+c.code+'-'+String(mi+1).padStart(2,'0')};
  meta.rows.push([id,cycle,country,String(emps),grossTxt,'Pending']);
  lpLandedAt('payroll',meta.rows.length-1);
  prCreateOpen=false;
  renderADTPage();
  showToast('Pay run created','success',cycle+' · '+country+' is set up and pending approval.');
}

/* ── Payments: Create Invoice ────────────────────────────────────────────── */
let pmCreateOpen=false;
function startAddInvoice(){pmCreateOpen=true;renderADTPage();}
function cancelAddInvoice(){pmCreateOpen=false;renderADTPage();}
const PM_ORDER_TYPES=['EOR - Employee','PEO - Employee','Contractor','Immigration'];

function buildCreateInvoiceModalHTML(){
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form" role="dialog" aria-modal="true" aria-label="Create Invoice" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create Invoice</span>'
      +'<button class="ct-modal-close" onclick="cancelAddInvoice()" aria-label="Close">'+PAY_X_SVG+'</button></div>'
    +'<p class="ct-modal-sub">Who is billed, for what engagement, and how much. It is created Unpaid.</p>'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Worker Name <span class="req">*</span></label>'
      +'<input type="text" class="ep-form-input" id="pm-new-name" placeholder="Full name"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Order Type <span class="req">*</span></label>'
      +customSelect('pm-new-type','',PM_ORDER_TYPES,'Select Type')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Client Company <span class="req">*</span></label>'
      +'<input type="text" class="ep-form-input" id="pm-new-company" placeholder="Billed company"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Working Country <span class="req">*</span></label>'
      +customSelect('pm-new-country','',PAY_COUNTRY_LIST,'Select Country')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Start From <span class="req">*</span></label>'
      +apCD('pm-new-start','','Select date')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">End To <span class="req">*</span></label>'
      +apCD('pm-new-end','','Select date')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Rate Type <span class="req">*</span></label>'
      +customSelect('pm-new-rate-type','Monthly',['Monthly','Daily','Hourly','Fixed'],'Select Rate Type')+'</div>'
    // How approved timesheets on this order are billed - see js/ts-billing.js.
    +'<div class="ep-form-group"><label class="ep-form-label">Payment Cycle <span class="req">*</span></label>'
      +csWithHints(customSelect('pm-new-cycle','Monthly',TS_CYCLES.map(function(c){return c.v;}),'Select Payment Cycle'),TS_CYCLE_HINTS)+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Amount <span class="req">*</span></label>'
      +'<input type="number" min="0" step="0.01" class="ep-form-input" id="pm-new-amount" placeholder="In the country\'s currency"></div>'
    +'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="cancelAddInvoice()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="submitAddInvoice()">Create Invoice</button>'
    +'</div></div>'
    +'</div></div>';
}

function submitAddInvoice(){
  const v=function(id){const el=document.getElementById(id);return el?el.value.trim():'';};
  const name=v('pm-new-name'),company=v('pm-new-company');
  const type=getCustomSelectValue('pm-new-type'),country=getCustomSelectValue('pm-new-country');
  const rateType=getCustomSelectValue('pm-new-rate-type')||'Monthly';
  const cycle=tsCycleOf(getCustomSelectValue('pm-new-cycle'));
  const startIso=getCDValue('pm-new-start'),endIso=getCDValue('pm-new-end');
  const amount=parseFloat(v('pm-new-amount'));
  if(!name)return payFlash('Please enter the Worker Name');
  if(!type)return payFlash('Please select an Order Type');
  if(!company)return payFlash('Please enter the Client Company');
  if(!country)return payFlash('Please select a Working Country');
  if(!startIso)return payFlash('Please select a Start date');
  if(!endIso)return payFlash('Please select an End date');
  if(endIso<startIso)return payFlash('End date cannot be before the Start date');
  if(isNaN(amount)||amount<0)return payFlash('Please enter the Amount');

  const cur=PAY_COUNTRIES[country].currency;
  const id=paymentsData.reduce(function(m,p){return Math.max(m,p.id);},0)+1;
  const orderId=String(paymentsData.reduce(function(m,p){return Math.max(m,parseInt(p.orderId,10)||0);},0)+1);
  const s=stampNow();
  const days=Math.round((new Date(endIso)-new Date(startIso))/86400000)+1;
  const money=payMoney(cur,amount);
  /* Every nested block the detail panel's tabs read is filled, with '—' where
     the form does not ask - an undefined there would print "undefined". */
  paymentsData.unshift({id:id,orderId:orderId,name:name,amountDue:money,type:type,
    orderStatus:'Onboarding',invoiceStatus:'Unpaid',
    key:orderId,dealId:'—',entityName:company,addedFrom:'agency',createdTime:s.date+' | '+s.time,
    courseId:'—',courseName:'—',lastUpdated:'--',startFrom:payDateLabel(startIso),endTo:payDateLabel(endIso),
    workingCountry:country,orderCategory:'international',
    emp:{empId:'—',name:name,email:'—',mobile:'—',status:'Pending Onboarding',createdOn:s.date+' | '+s.time},
    sales:{companyId:'—',companyName:company,contactPersonId:'—',contactPersonName:CURRENT_USER,rateType:rateType,
      days:'0',rate:money,totalAmount:money,contractPeriod:String(days),workLocation:country,tsPeriodDate:'—',paymentTerm:'0',
      paymentCycle:cycle,currency:cur,rateSchedule:[{from:startIso,amount:amount}]},
    user:{
      company:{userId:'—',concernPersonName:CURRENT_USER,companyName:company,firstName:'—',lastName:'—',email:'—',mobile:'—',altMobile:'—',website:'—',address:'—'},
      concern:{key:'—',name:CURRENT_USER,mobile:'—',email:'—',date:s.date+' | '+s.time,createBy:CURRENT_USER,address:'—'}
    },
    attachments:[]});
  pmWorkflowData[id]=[{title:'Order Created',user:CURRENT_USER,date:s.date,time:s.time,description:type+' order created for '+name+' in '+country+'.'}];
  pmLogsData[id]=[{date:s.date,time:s.time,user:CURRENT_USER,status:'Onboarding',action:'Invoice created for '+name+'.'}];
  lpLanded('payments',id);
  pmCreateOpen=false;
  renderADTPage();
  showToast('Invoice created','success','Order '+orderId+' · '+name+' · '+money+' (Unpaid).');
}

/* Escape closes whichever of the two is open. */
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  if(prCreateOpen&&page==='payroll')cancelAddPayRun();
  else if(pmCreateOpen&&page==='payments')cancelAddInvoice();
});
