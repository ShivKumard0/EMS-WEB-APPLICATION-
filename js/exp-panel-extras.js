/* ══ EXPENSE CLAIM PANEL: reimbursement in Logs, Bank Details tab (product owner, 12 Nov 2026) ═══════════════════
   The claim panel's tabs are Basic Details (with the line items) · Bank Details · Logs · History · Workflow.
   - Logs shows, below the log entries, the approval details and the reimbursement (status, amounts, lines and payment
     history). Its payment buttons show only when the claim is opened from Manage → Reimbursement Queue, where Finance
     takes the payment steps; elsewhere it is read-only.
   - Bank Details: the account the employee is reimbursed to. An account stored on the employee record is shown as it
     is. In the presentation company, where employees carry no stored account, realistic details are made up at draw
     time from the employee - never saved, the account number masked - as the card number on My Cards is. */
function expReimbLogHTML(r){
  const html=caReimbTabHTML(r);
  if(typeof expPageTab!=='undefined'&&expPageTab==='reimb')return html;
  const t=document.createElement('div');t.innerHTML=html;
  t.querySelectorAll('.lp-sb-view-header .ca-actions button').forEach(function(b){b.remove();});
  return t.innerHTML;
}
const EXP_BANKS=[['HDFC Bank','HDFC'],['ICICI Bank','ICIC'],['State Bank of India','SBIN'],['Axis Bank','UTIB'],['Kotak Mahindra Bank','KKBK']];
function expBankHash(s){let h=2166136261;String(s).split('').forEach(function(ch){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;});return h;}
function expBankOf(eid){
  const e=typeof idEmp==='function'?idEmp(eid):null;if(!e)return null;
  if(e.bank&&typeof e.bank==='object')return e.bank;
  if(!(typeof presClientHere==='function'&&presClientHere()))return null;
  const h=expBankHash(eid+'|'+(e.empId||'')),b=EXP_BANKS[h%EXP_BANKS.length];
  const city=String(e.branch||e.location||e.workLocation||'Mumbai').replace(/\s*Branch$/i,'')||'Mumbai';
  const last4=String(1000+(h%9000)),code=String(100000+((h>>>7)%900000));
  return {holder:e.name||'',bank:b[0],acct:'•••• •••• '+last4,ifsc:b[1]+'0'+code,branch:city,type:'Savings',mode:'NEFT'};
}
function expBankHTML(r){
  const b=expBankOf(r.employeeEid);
  const head='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Bank Details</span></div>';
  if(!b)return head+'<div class="wb-empty-sm">No bank account is on '+sbEsc(r.name||'the employee')+'\'s employee record.</div>';
  return head+'<div class="lp-sb-detail-grid">'
    +axField(AX_ICO.fUser,'Account Holder',sbEsc(b.holder))
    +axField(AX_ICO.fBuild,'Bank Name',sbEsc(b.bank))
    +axField(AX_ICO.fHash,'Account Number',sbEsc(b.acct))
    +axField(AX_ICO.fHash,'IFSC Code',sbEsc(b.ifsc))
    +axField(AX_ICO.fBuild,'Branch',sbEsc(b.branch))
    +axField(AX_ICO.fTag,'Account Type',sbEsc(b.type))
    +axField(AX_ICO.fCash,'Payment Mode',sbEsc(b.mode))
    +'</div>';
}
