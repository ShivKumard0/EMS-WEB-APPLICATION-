/* ══ BULK UPLOAD EMPLOYEES (FR-EMS-EMP-01, 8 Nov 2026) ══════════════════════
   Employees → + → Bulk Upload Employees. A centred popup: download the
   company's Excel format, drop the filled file, validate, review, create.

   Nothing here is a second employee system. Every row becomes a record through
   eaCreateEmployee (js/employee-add.js), the function the five-step wizard
   uses, so a bulk-created employee is the same record with the same lifecycle,
   profile, onboarding and Card KYC as one added by hand. The Employee ID comes
   from eaNextEmpId (per company, never reused); departments and designations
   come from the company's Company Structure and are never created from text;
   no account, role, card, load or benefit is created from a spreadsheet.

   The file is the 16-column Employees sheet of the downloaded format (A-L as
   specified, M-P Gender, Date of Birth, Nationality, ID Proof Types). Employee
   Status (Pending / Onboarding) is chosen once in the popup for the batch.
   Validation never creates anything; Create Employees (or Create Valid
   Employees, confirmed) does, once. Each upload keeps a batch record. */

const EMB_MAX_ROWS=500,EMB_MAX_BYTES=5*1024*1024;
const EMB_LAST_ROW=EMB_MAX_ROWS+1;      // validations in the format cover this many rows
/* The importer's columns, in order. `req` follows the wizard: every field it
   requires is required here; Reporting Manager is optional there too. */
const EMB_COLS=[
  {k:'fname',h:'First Name',req:1,purpose:'The employee\'s first (given) name.',fmt:'Text',val:'Cannot be blank. Spaces before and after are removed.',note:'As on official records.'},
  {k:'lname',h:'Last Name',req:1,purpose:'The employee\'s last (family) name.',fmt:'Text',val:'Cannot be blank.',note:'No placeholder text.'},
  {k:'email',h:'Work Email',req:1,purpose:'Identifies the employee in ADT.',fmt:'name@company.com',val:'A valid email. Unique in the file and among this company\'s employees.',note:'Never include passwords.'},
  {k:'dial',h:'Country Dial Code',req:1,purpose:'Dialling prefix of the mobile number.',fmt:'Text, e.g. +91',val:'One of the listed dial codes.',list:'dial',note:'Keep the + sign.'},
  {k:'phone',h:'Mobile Number',req:1,purpose:'The employee\'s contact number.',fmt:'Text, digits only',val:'At least 7 digits.',note:'Enter as text so no digit is lost.'},
  {k:'country',h:'Employment Country',req:1,purpose:'Country of employment.',fmt:'Country name',val:'Must be this company\'s country.',list:'country',note:'Employees of other countries are added one at a time with Add Employee.'},
  {k:'doj',h:'Date of Joining',req:1,purpose:'Employment start date.',fmt:'YYYY-MM-DD',val:'A valid calendar date.',date:1,note:'Joining does not make the employee Active; completing onboarding does.'},
  {k:'empType',h:'Employment Type',req:1,purpose:'Employment arrangement.',fmt:'Listed value',val:'One of the listed employment types.',list:'empType',note:''},
  {k:'dept',h:'Department',req:1,purpose:'Department in Company Structure.',fmt:'Listed value',val:'Must exist in this company\'s Company Structure.',list:'dept',note:'Departments are never created from the file.'},
  {k:'designation',h:'Designation',req:1,purpose:'Designation in Company Structure.',fmt:'Listed value',val:'Must exist in this company\'s Company Structure.',list:'desig',note:'Designations are never created from the file.'},
  {k:'manager',h:'Reporting Manager Email',req:0,purpose:'The employee\'s reporting manager.',fmt:'Work email',val:'An employee of this company, or another row in this file; not the employee themself.',note:'Gives the manager no extra access.'},
  {k:'location',h:'Work Location',req:1,purpose:'Where the employee works.',fmt:'Listed value',val:'One of the listed work locations.',list:'location',note:''},
  {k:'gender',h:'Gender',req:1,purpose:'Gender.',fmt:'Listed value',val:'One of the listed values.',list:'gender',note:''},
  {k:'dob',h:'Date of Birth',req:1,purpose:'Date of birth.',fmt:'YYYY-MM-DD',val:'A valid past date, before the Date of Joining.',date:1,note:''},
  {k:'nationality',h:'Nationality',req:1,purpose:'Nationality.',fmt:'Listed value',val:'One of the listed nationalities.',list:'nationality',note:''},
  {k:'idProofs',h:'ID Proof Types',req:1,purpose:'ID proofs the employee holds.',fmt:'Names separated by ";", e.g. PAN Card; Passport',val:'Each must be a listed ID proof type.',list:'idProof',note:'Names only. No ID numbers or documents.'}
];
const EMB_LISTS=[['country','Employment Country'],['empType','Employment Type'],['dept','Department'],['desig','Designation'],['location','Work Location'],['gender','Gender'],['nationality','Nationality'],['idProof','ID Proof Types'],['dial','Country Dial Code']];
const EMB_STEPS=['Select the correct company in ADT before downloading/uploading the employee file.','Open the Employees worksheet.','Keep the specified column names and order unchanged.','Enter one employee per row.',
  'Use valid company-configured Department, Designation and Employment Type values.','Enter dates using YYYY-MM-DD and mobile numbers as text.','Upload the completed Excel file and review the validation preview.',
  'Correct invalid/duplicate records before confirming creation.','Confirm employee creation; employee IDs are generated automatically by ADT.','Complete individual employee onboarding, access assignment and Card KYC separately where required.'];
const EMB_WARNING='Do not upload passwords, PAN, national identity numbers, bank credentials, full card numbers, PINs, CVVs or employee declarations in this file.';
const EMB_GUIDE_NOTE='The template follows the existing ADT Add Employee requirements. Additional company-specific mandatory fields, where applicable, must be included in the company-generated template.';

/* ── Upload records, one per created batch, per company ─────────────────── */
const embBatches=[];
let embBatchNext=1001;
function embBatchesHere(){const ent=idEntity();return embBatches.filter(function(b){return b.entityId===ent;});}

/* ── The company's own value lists (the wizard's lists and Company Structure) ── */
function embCompany(){return typeof idEntityRec==='function'?idEntityRec(idEntity()):null;}
function embLists(){
  const ent=embCompany();
  return {country:ent&&ent.country?[ent.country]:[],empType:EA_EMP_TYPES.slice(),
    dept:typeof csDeptNames==='function'?csDeptNames():[],desig:typeof csDesigNames==='function'?csDesigNames():[],
    location:EA_LOCATIONS.slice(),gender:EA_GENDERS.slice(),nationality:EA_NATIONALITIES.slice(),idProof:EA_ID_PROOFS.slice(),dial:EA_DIAL_CODES.slice()};
}

/* ══ EMPLOYEES + : Add Employee / Bulk Upload Employees ═══════════════════ */
let embMenuWasOpen=false;
function embMenuEl(){
  let m=document.getElementById('emb-plus-menu');
  if(!m){
    const w=document.createElement('div');w.className='ct-action-wrap emb-plus-wrap';
    w.innerHTML='<div class="ct-action-menu emb-plus-menu" id="emb-plus-menu" role="menu"></div>';
    document.body.appendChild(w);m=w.firstChild;
  }
  return m;
}
/* The + button: one right → straight to it, as before; both → the menu. */
function embPlusClick(){
  const canAdd=emsCan('h2r.employee.create'),canBulk=emsCan('h2r.employee.bulk');
  const btn=document.getElementById('tb-page-add-btn');
  if(!canBulk||!btn){addListingItem(page);return;}
  if(!canAdd){embOpen();return;}
  const m=embMenuEl();
  if(embMenuWasOpen){embMenuWasOpen=false;m.classList.remove('open');return;}
  m.innerHTML='<div class="ct-act-item" role="menuitem" onclick="embMenuPick(\'add\')">'+EMB_ICO.addUser+'<span>Add Employee</span></div>'
    +'<div class="ct-act-item" role="menuitem" onclick="embMenuPick(\'bulk\')">'+EMB_ICO.upload+'<span>Bulk Upload Employees</span></div>';
  document.querySelectorAll('.ct-action-menu.open').forEach(function(x){x.classList.remove('open');});
  m.classList.add('open');
  placeAnchoredMenu(m,btn.getBoundingClientRect(),{alignLeft:true});
}
/* A click on + while the menu is open closes it: remember, before the app's
   outside-click sweep runs, whether it was open. */
document.addEventListener('mousedown',function(e){
  if(e.target&&e.target.closest&&e.target.closest('#tb-page-add-btn')){const m=document.getElementById('emb-plus-menu');embMenuWasOpen=!!(m&&m.classList.contains('open'));}
},true);
function embMenuPick(what){
  const m=document.getElementById('emb-plus-menu');if(m)m.classList.remove('open');
  embMenuWasOpen=false;
  if(what==='bulk')embOpen();else addListingItem(page);
}

/* ══ THE POPUP ═════════════════════════════════════════════════════════════ */
let emb=null;    // {entityId, status, file:{name,size,u8}, stage, error, result, filter, busy, batch}
function embOpen(){
  if(!emsCan('h2r.employee.bulk')){emsDeny('bulk upload employees');return;}
  if(!embCompany()){showToast('No company selected','error','Select a company first.');return;}
  emb={entityId:idEntity(),status:'Pending',file:null,stage:'select',error:'',result:null,filter:'All',busy:false,batch:null,confirm:false};
  embRender();
}
function embClose(){
  emb=null;
  const h=document.getElementById('emb-host');if(h)h.remove();
}
function embHost(){
  let h=document.getElementById('emb-host');
  if(!h){h=document.createElement('div');h.id='emb-host';document.body.appendChild(h);}
  return h;
}
function embRender(){
  if(!emb){embClose();return;}
  /* A different company while the popup is open: it no longer applies. */
  if(emb.entityId!==idEntity()){embClose();return;}
  const keep=document.querySelector('#emb-host .emb-modal');const top=keep?keep.scrollTop:0;
  embHost().innerHTML=embHTML();
  const nm=document.querySelector('#emb-host .emb-modal');if(nm)nm.scrollTop=top;
}
function embSetStatus(v){if(emb&&(v==='Pending'||v==='Onboarding'))emb.status=v;}

const EMB_ICO={
  upload:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  addUser:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
  down:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  sheet:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="12" y1="11" x2="12" y2="19"/></svg>',
  trash:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  x:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};
function embEsc(v){return typeof sbEsc==='function'?sbEsc(v):String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}

function embHTML(){
  const ent=embCompany(),r=emb.result,done=emb.stage==='done';
  let body='<div class="ep-form-grid emb-head">'
    +'<div class="ep-form-group"><label class="ep-form-label">Company</label><div class="ea-locked">'+EA_ICONS.lock+'<span>'+embEsc(ent?ent.name:'')+'</span></div></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employee Status <span class="req">*</span></label>'
      +(done||emb.busy?'<div class="ea-locked">'+EA_ICONS.lock+'<span>'+embEsc(emb.status)+'</span></div>':apCS('emb-status',['Pending','Onboarding'],emb.status,'Select status','embSetStatus'))+'</div>'
    +'</div>';
  if(done)body+=embDoneHTML();
  else{
    body+='<div class="emb-up-head"><span class="ep-form-label">Upload Excel File</span>'
      +'<button type="button" class="btn btn-outline btn-sm emb-format-btn" onclick="embDownloadFormat()">'+EMB_ICO.down+' Download Format</button></div>';
    if(emb.file){
      body+='<div class="ax-img-row emb-file"><span class="emb-file-ico">'+EMB_ICO.sheet+'</span>'
        +'<span class="ax-img-name" title="'+embEsc(emb.file.name)+'">'+embEsc(emb.file.name)+'</span>'
        +'<span class="emb-file-size">'+attachFmtSize(emb.file.size)+'</span>'
        +(emb.busy?'':'<button type="button" class="att-link emb-file-act" onclick="embBrowse()">Replace</button>'
          +'<button type="button" class="att-row-btn is-danger" onclick="embRemove()" title="Remove file">'+EMB_ICO.trash+'</button>')
        +'</div>';
    }else{
      body+='<div class="att-zone ax-img-zone emb-zone" role="button" tabindex="0" onclick="embBrowse()" onkeydown="embKey(event)"'
        +' ondragover="embDrag(event,true)" ondragleave="embDrag(event,false)" ondrop="embDrop(event)">'
        +'<span class="att-zone-ico">'+EMB_ICO.upload+'</span>'
        +'<span><span class="att-zone-title">Drag and drop an Excel file here, or browse</span>'
        +'<span class="att-zone-hint"> · .xlsx, up to '+EMB_MAX_ROWS+' employees</span></span></div>';
    }
    body+='<input type="file" id="emb-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onchange="embPicked(this)">'
      +'<div class="emb-sample"><button type="button" class="att-link" onclick="embDownloadSample()">Download Sample</button></div>';
    if(emb.error)body+='<div class="wb-note is-bad">'+emb.error+'</div>';
    if(emb.stage==='validating')body+='<div class="wb-note">Validating the file…</div>';
    if(r)body+=embResultHTML();
    else if(!emb.file)body+=embRecentHTML();
  }
  return '<div class="ct-modal-overlay emb-overlay">'
    +'<div class="ct-modal emb-modal" role="dialog" aria-modal="true" aria-label="Bulk Upload Employees" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Bulk Upload Employees</span>'
      +'<button class="ct-modal-close" onclick="embClose()" title="Close">'+EMB_ICO.x+'</button></div>'
    +body
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'+embFootHTML()+'</div></div>'
    +'</div></div>';
}
function embFootHTML(){
  if(emb.stage==='done')return '<button class="ep-cancel-btn" onclick="embAgain()">Upload Another File</button><button class="ep-save-btn" onclick="embClose()">Done</button>';
  const r=emb.result,dis=function(b){return b?' disabled':'';};
  let main;
  if(!r)main='<button class="ep-save-btn" onclick="embValidate()"'+dis(!emb.file||emb.busy)+'>Validate File</button>';
  else if(emb.confirm)main='<button class="ep-save-btn" onclick="embCreate(true)"'+dis(emb.busy)+'>Confirm</button>';
  else if(r.valid&&r.valid===r.total)main='<button class="ep-save-btn" onclick="embCreate(false)"'+dis(emb.busy)+'>Create Employees</button>';
  else if(r.valid)main='<button class="ep-save-btn" onclick="embCreate(false)"'+dis(emb.busy)+'>Create Valid Employees ('+r.valid+')</button>';
  else main='<button class="ep-save-btn" disabled>Create Employees</button>';
  return '<button class="ep-cancel-btn" onclick="'+(emb.confirm?'embConfirmBack()':'embClose()')+'"'+dis(emb.busy)+'>'+(emb.confirm?'Back':'Cancel')+'</button>'+main;
}
function embStat(label,n,tone){
  const on=emb.filter===label;
  return '<div class="listing-stat'+(on?' stat-selected':'')+'" onclick="embFilter(\''+label+'\')"><div class="listing-stat-count" style="color:var(--st-'+tone+'-fg)">'+n+'</div><div class="listing-stat-label">'+label+'</div></div>';
}
function embFilter(f){if(!emb)return;emb.filter=emb.filter===f?'All':f;embRender();}
function embBadge(st){return axBadge(st==='Valid'||st==='Created'?'ok':st==='Duplicate'?'wait':'bad',st);}
function embResultHTML(){
  const r=emb.result;
  let h='<div class="emb-res-head"><span class="ep-form-label">Validation</span>'
    +((r.invalid||r.duplicate)?'<button type="button" class="att-link" onclick="embDownloadErrors()">'+EMB_ICO.down+' Download Errors</button>':'')+'</div>'
    +'<div class="listing-stats emb-stats">'+embStat('Total',r.total,'idle')+embStat('Valid',r.valid,'ok')+embStat('Invalid',r.invalid,'bad')+embStat('Duplicate',r.duplicate,'wait')+'</div>';
  if(r.sameAs)h+='<div class="wb-note">The same rows were uploaded in '+embEsc(r.sameAs.id)+' on '+embEsc(r.sameAs.at)+'.</div>';
  if(emb.confirm)h+='<div class="wb-note is-wait emb-confirm">Create '+r.valid+' employee'+(r.valid===1?'':'s')+' in '+embEsc(embCompany().name)+' as '+embEsc(emb.status)+'? '
    +(r.total-r.valid)+' row'+(r.total-r.valid===1?'':'s')+' will not be imported.</div>';
  const rows=r.rows.filter(function(x){return emb.filter==='All'||emb.filter==='Total'||x.status===emb.filter;});
  h+='<div class="att-table-wrap csag-table-wrap emb-rows"><table class="att-table csag-table"><thead><tr><th>Row</th><th>Employee</th><th>Work Email</th><th>Department</th><th>Status</th><th>Error Details</th></tr></thead><tbody>'
    +(rows.length?rows.map(function(x){
      return '<tr><td class="csag-td">'+x.n+'</td><td class="csag-td">'+embEsc(x.name||'—')+'</td><td class="csag-td">'+embEsc(x.d.email||'—')+'</td><td class="csag-td">'+embEsc(x.d.dept||'—')+'</td>'
        +'<td class="csag-td">'+embBadge(x.status)+'</td><td class="csag-td emb-err">'+(x.errors.length?x.errors.map(function(e){return embEsc(e.msg);}).join('; '):'—')+'</td></tr>';
    }).join(''):'<tr><td class="csag-td" colspan="6">No rows.</td></tr>')
    +'</tbody></table></div>';
  return h;
}
function embDoneHTML(){
  const b=emb.batch,ok=b.created.length,rest=b.total-ok;
  let h='<div class="wb-note'+(rest?' is-wait':'')+' emb-done">'+embEsc(embDoneText(b))+'</div>'
    +'<div class="emb-res-head"><span class="ep-form-label">'+embEsc(b.id)+' · '+embEsc(b.fileName)+'</span>'
    +'<button type="button" class="att-link" onclick="embDownloadResults(\''+b.id+'\')">'+EMB_ICO.down+' Download Results</button></div>'
    +'<div class="att-table-wrap csag-table-wrap emb-rows"><table class="att-table csag-table"><thead><tr><th>Row</th><th>Employee</th><th>Employee ID</th><th>Result</th><th>Details</th></tr></thead><tbody>'
    +b.rows.map(function(x){return '<tr><td class="csag-td">'+x.n+'</td><td class="csag-td">'+embEsc(x.name||'—')+'</td><td class="csag-td">'+embEsc(x.empId||'—')+'</td><td class="csag-td">'+embBadge(x.result==='Created'?'Created':x.result==='Duplicate'?'Duplicate':'Not created')+'</td><td class="csag-td emb-err">'+embEsc(x.details||'—')+'</td></tr>';}).join('')
    +'</tbody></table></div>';
  return h;
}
function embDoneText(b){
  const ok=b.created.length,rest=b.total-ok;
  return ok+' employee'+(ok===1?'':'s')+' created successfully.'+(rest?' '+rest+' record'+(rest===1?'':'s')+' require'+(rest===1?'s':'')+' review.':'');
}
function embRecentHTML(){
  const list=embBatchesHere().slice(0,3);
  if(!list.length)return '';
  return '<div class="emb-res-head"><span class="ep-form-label">Recent uploads</span></div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Upload</th><th>File</th><th>Uploaded</th><th>Result</th><th></th></tr></thead><tbody>'
    +list.map(function(b){return '<tr><td class="csag-td">'+embEsc(b.id)+'</td><td class="csag-td">'+embEsc(b.fileName)+'</td><td class="csag-td">'+embEsc(b.at)+' · '+embEsc(idName(b.by))+'</td>'
      +'<td class="csag-td">'+embEsc(b.created.length+' of '+b.total+' created')+'</td><td class="csag-td"><button type="button" class="att-link" onclick="embDownloadResults(\''+b.id+'\')">Download Results</button></td></tr>';}).join('')
    +'</tbody></table></div>';
}

/* ── Choosing the file ─────────────────────────────────────────────────── */
function embBrowse(){if(!emb||emb.busy)return;const i=document.getElementById('emb-file');if(i){i.value='';i.click();}}
function embKey(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();embBrowse();}}
function embDrag(e,on){e.preventDefault();e.currentTarget.classList.toggle('is-over',on);}
function embDrop(e){e.preventDefault();e.currentTarget.classList.remove('is-over');const f=e.dataTransfer&&e.dataTransfer.files;if(f&&f.length)embTake(f[0]);}
function embPicked(inp){if(inp.files&&inp.files.length)embTake(inp.files[0]);}
function embTake(f){
  if(!emb||emb.busy)return Promise.resolve();
  emb.result=null;emb.filter='All';emb.confirm=false;emb.error='';emb.file=null;emb.stage='select';
  if(!/\.xlsx$/i.test(f.name)){emb.error='Upload an Excel file (.xlsx). Download the format if you need it.';embRender();return Promise.resolve();}
  if(f.size>EMB_MAX_BYTES){emb.error='The file is '+attachFmtSize(f.size)+'; the limit is '+attachFmtSize(EMB_MAX_BYTES)+'. Split it into smaller files.';embRender();return Promise.resolve();}
  return f.arrayBuffer().then(function(buf){
    if(!emb)return;
    emb.file={name:f.name,size:f.size,u8:new Uint8Array(buf)};
    embRender();
  });
}
/* For tests and a programmatic upload: the same path as a picked file. */
function embTakeBytes(name,u8){return embTake({name:name,size:u8.length,arrayBuffer:function(){return Promise.resolve(u8.buffer.slice(u8.byteOffset,u8.byteOffset+u8.length));}});}
function embRemove(){if(!emb||emb.busy)return;emb.file=null;emb.result=null;emb.error='';emb.confirm=false;emb.filter='All';emb.stage='select';embRender();}
function embAgain(){if(!emb)return;emb.file=null;emb.result=null;emb.error='';emb.confirm=false;emb.filter='All';emb.stage='select';emb.batch=null;embRender();}
function embConfirmBack(){if(!emb)return;emb.confirm=false;embRender();}

/* ── Reading the Employees sheet ───────────────────────────────────────── */
function embReadSheet(u8,sheetName){
  if(typeof ccZipEntries!=='function')return Promise.reject(new Error('The file could not be read.'));
  const z=ccZipEntries(u8);
  if(!z||!z['xl/workbook.xml'])return Promise.reject(new Error('The file could not be read. Upload the Excel format (.xlsx).'));
  return Promise.all([ccZipText(z['xl/workbook.xml']),ccZipText(z['xl/_rels/workbook.xml.rels']),ccZipText(z['xl/sharedStrings.xml'])]).then(function(t){
    const P=new DOMParser(),wb=P.parseFromString(t[0],'application/xml'),shs=ccXmlAll(wb,'sheet');
    let sh=null;
    for(let i=0;i<shs.length;i++)if(String(shs[i].getAttribute('name')||'').trim().toLowerCase()===sheetName.toLowerCase())sh=shs[i];
    if(!sh)throw new Error('The file has no '+sheetName+' worksheet. Download the format and fill its '+sheetName+' sheet.');
    const rid=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    let target='';
    if(t[1]){const rels=ccXmlAll(P.parseFromString(t[1],'application/xml'),'Relationship');for(let i=0;i<rels.length;i++)if(rels[i].getAttribute('Id')===rid)target=rels[i].getAttribute('Target');}
    if(!target)throw new Error('The '+sheetName+' worksheet could not be read.');
    target=target.replace(/^\//,'');if(target.indexOf('xl/')!==0)target='xl/'+target;
    const ss=[];
    if(t[2]){const si=ccXmlAll(P.parseFromString(t[2],'application/xml'),'si');for(let i=0;i<si.length;i++){const ts=ccXmlAll(si[i],'t');let s='';for(let j=0;j<ts.length;j++)s+=ts[j].textContent;ss.push(s);}}
    return ccZipText(z[target]).then(function(x){
      if(x==null)throw new Error('The '+sheetName+' worksheet could not be read.');
      const doc=P.parseFromString(x,'application/xml');
      if(doc.getElementsByTagName('parsererror').length)throw new Error('The '+sheetName+' worksheet is damaged. Save the file again as .xlsx.');
      const rs=ccXmlAll(doc,'row'),grid=[];
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
/* Dates: YYYY-MM-DD typed as text, or a real Excel date cell (a day number).
   Anything else - 05/11/2026 could be May or November - is refused. */
function embDate(v){
  v=String(v==null?'':v).trim();if(!v)return '';
  let iso=null,m;
  if((m=/^(\d{4})-(\d{2})-(\d{2})(?:[T ]00:00(?::00(?:\.0+)?)?)?$/.exec(v)))iso=m[1]+'-'+m[2]+'-'+m[3];
  else if(/^\d{1,5}(\.0+)?$/.test(v)){const n=Math.floor(Number(v));if(n>=1&&n<80000)iso=new Date(Date.UTC(1899,11,30)+n*86400000).toISOString().slice(0,10);}
  if(!iso)return null;
  const ms=Date.parse(iso+'T00:00:00Z');
  return !isNaN(ms)&&new Date(ms).toISOString().slice(0,10)===iso?iso:null;
}
/* Long numbers saved as numbers come back as 9.9999E+9; give back the digits. */
function embDigits(v){
  v=String(v==null?'':v).trim();
  if(/^\d+(\.\d+)?E\+\d+$/i.test(v)){const n=Number(v);if(isFinite(n))v=n.toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:0});}
  return v.replace(/\.0+$/,'');
}
function embPick(list,v){v=String(v||'').trim().toLowerCase().replace(/\s+/g,' ');return list.find(function(x){return x.toLowerCase()===v;})||'';}
const EMB_PROOF_ALIAS={'aadhaar card':'Aadhar Card','aadhaar':'Aadhar Card','aadhar':'Aadhar Card','pan':'PAN Card','driving licence':'Driving License'};
function embNorm(h){return String(h||'').trim().toLowerCase().replace(/\s+/g,' ');}

/* ── Validating ─────────────────────────────────────────────────────────── */
function embValidate(){
  if(!emb||!emb.file||emb.busy)return Promise.resolve();
  if(!emsCan('h2r.employee.bulk')){emsDeny('bulk upload employees');return Promise.resolve();}
  if(emb.entityId!==idEntity()){embClose();return Promise.resolve();}
  emb.error='';emb.result=null;emb.confirm=false;emb.filter='All';emb.stage='validating';emb.busy=true;embRender();
  return embReadSheet(emb.file.u8,'Employees').then(function(grid){
    if(!emb)return;
    const res=embCheck(grid);
    emb.busy=false;emb.stage='validated';
    if(res.error){emb.error=res.error;emb.stage='select';}
    else emb.result=res;
    embRender();
  }).catch(function(err){
    if(!emb)return;
    emb.busy=false;emb.stage='select';emb.error=embEsc(err&&err.message?err.message:'The file could not be read.');embRender();
  });
}
/* The whole file against the format and the company. {error} for a file that
   cannot be imported at all; otherwise per-row results and the counts. */
function embCheck(grid){
  const head=grid[0]||[];
  for(let i=0;i<EMB_COLS.length;i++){
    if(embNorm(head[i])!==embNorm(EMB_COLS[i].h))
      return {error:'Column '+tsxColLetter(i+1)+' should be "'+embEsc(EMB_COLS[i].h)+'"'+(head[i]?' (found "'+embEsc(head[i])+'")':'')+'. Keep the downloaded format\'s columns and order.'};
  }
  for(let i=EMB_COLS.length;i<head.length;i++)if(String(head[i]||'').trim())
    return {error:'Column '+tsxColLetter(i+1)+' "'+embEsc(head[i])+'" is not part of the format. Remove it and upload again.'};
  const data=[];
  for(let i=1;i<grid.length;i++){
    const row=grid[i]||[];
    if(!row.slice(0,EMB_COLS.length).some(function(v){return String(v||'').trim();}))continue;
    data.push({n:i+1,raw:row});
  }
  if(!data.length)return {error:'The Employees sheet has no employee rows. Enter one employee per row below the headers.'};
  if(data.length>EMB_MAX_ROWS)return {error:'The file has '+data.length+' employee rows; the limit is '+EMB_MAX_ROWS+'. Split it into smaller files.'};
  const L=embLists(),ent=idEntity(),entRec=embCompany();
  const allCountries=[].concat(EA_NATIONALITIES,EA_COUNTRIES,(typeof entitiesData!=='undefined'?entitiesData:[]).map(function(e){return e.country;}));
  const today=typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10);
  const seen={},rows=[];
  data.forEach(function(x){
    const v=function(k){const i=EMB_COLS.findIndex(function(c){return c.k===k;});return String(x.raw[i]==null?'':x.raw[i]).trim();};
    const d={},errs=[],dupe=[];
    const err=function(field,msg){errs.push({field:field,msg:msg});};
    EMB_COLS.forEach(function(c){d[c.k]=v(c.k);});
    d.phone=embDigits(d.phone);d.dial=embDigits(d.dial);
    EMB_COLS.forEach(function(c){if(c.req&&!d[c.k])err(c.h,c.h+' is required');});
    if(d.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email))err('Work Email','Enter a valid Work Email');
    if(d.dial){const dc=d.dial.charAt(0)==='+'?d.dial:'+'+d.dial;const p=embPick(L.dial,dc);if(p)d.dial=p;else err('Country Dial Code','Country Dial Code must be one of '+L.dial.join(', '));}
    if(d.phone){const dg=d.phone.replace(/[\s-]/g,'');if(!/^\d+$/.test(dg)||dg.length<7)err('Mobile Number','Enter a valid Mobile Number');else d.phone=dg;}
    if(d.country){const p=embPick(allCountries,d.country);
      if(!p)err('Employment Country','Employment Country not recognised');
      else if(!L.country.length||p!==L.country[0])err('Employment Country','Employment Country must be '+(L.country[0]||'the company\'s country')+' for this company');
      else d.country=p;}
    if(d.doj){const iso=embDate(d.doj);if(!iso)err('Date of Joining','Enter a valid Date of Joining');else d.doj=iso;}
    if(d.empType){const p=embPick(L.empType,d.empType);if(p)d.empType=p;else err('Employment Type','Employment Type not supported');}
    if(d.dept){const p=embPick(L.dept,d.dept);if(p)d.dept=p;else err('Department','Department not found in selected company');}
    if(d.designation){const p=embPick(L.desig,d.designation);if(p)d.designation=p;else err('Designation','Designation not found in selected company');}
    if(d.location){const p=embPick(L.location,d.location);if(p)d.location=p;else err('Work Location','Work Location not found');}
    if(d.gender){const p=embPick(L.gender,d.gender);if(p)d.gender=p;else err('Gender','Gender not supported');}
    if(d.dob){const iso=embDate(d.dob);
      if(!iso||iso>=today||(d.doj&&/^\d{4}-/.test(d.doj)&&iso>=d.doj))err('Date of Birth','Enter a valid Date of Birth');else d.dob=iso;}
    if(d.nationality){const p=embPick(L.nationality,d.nationality);if(p)d.nationality=p;else err('Nationality','Nationality not supported');}
    if(d.idProofs){
      const out=[];
      d.idProofs.split(/[;,]/).map(function(s){return s.trim();}).filter(Boolean).forEach(function(s){
        const p=embPick(L.idProof,EMB_PROOF_ALIAS[s.toLowerCase()]||s);
        if(!p)err('ID Proof Types','ID Proof Type not supported: '+s);else if(out.indexOf(p)<0)out.push(p);
      });
      if(!out.length&&!errs.some(function(e){return e.field==='ID Proof Types';}))err('ID Proof Types','ID Proof Types is required');
      d.idProofs=out;
    }else d.idProofs=[];
    if(d.manager&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.manager))err('Reporting Manager Email','Reporting Manager could not be resolved');
    /* Duplicates: the same email again in this file, or an employee who already exists. */
    const key=String(d.email||'').toLowerCase();
    if(key&&/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(key)){
      if(seen[key])dupe.push({field:'Work Email',msg:'Duplicate Work Email in uploaded file (row '+seen[key]+')'});
      else seen[key]=x.n;
      /* The shared rule (eaEmailOwner): unique within the company; another company's employee may share it. */
      const here=eaEmailOwner(key,ent);
      if(here)dupe.push({field:'Work Email',msg:'Employee record already exists ('+here.empId+')'});
    }
    rows.push({n:x.n,d:d,name:(d.fname+' '+d.lname).trim(),errors:errs,dupe:dupe,managerEid:'',managerRow:0});
  });
  /* Reporting managers: an employee of this company (not Inactive), or a valid row of this file. */
  const byEmail={};rows.forEach(function(r){const k=String(r.d.email||'').toLowerCase();if(k&&!byEmail[k])byEmail[k]=r;});
  rows.forEach(function(r){
    const m=String(r.d.manager||'').toLowerCase();if(!m||r.errors.some(function(e){return e.field==='Reporting Manager Email';}))return;
    if(m===String(r.d.email||'').toLowerCase()){r.errors.push({field:'Reporting Manager Email',msg:'An employee cannot be their own Reporting Manager'});return;}
    const e=idEmpByEmail(m,ent);
    if(e&&e.status!=='Inactive'){r.managerEid=e.eid;r.managerName=e.name;return;}
    const fr=byEmail[m];
    if(fr&&!fr.errors.length&&!fr.dupe.length){r.managerRow=fr.n;r.managerName=fr.name;return;}
    r.errors.push({field:'Reporting Manager Email',msg:'Reporting Manager could not be resolved'});
  });
  /* A row whose in-file manager will not be created cannot keep that manager. */
  rows.forEach(function(r){if(r.managerRow){const fr=rows.find(function(x){return x.n===r.managerRow;});if(!fr||fr.errors.length||fr.dupe.length){r.managerRow=0;r.errors.push({field:'Reporting Manager Email',msg:'Reporting Manager could not be resolved'});}}});
  rows.forEach(function(r){
    r.status=r.errors.length?'Invalid':r.dupe.length?'Duplicate':'Valid';
    if(r.status==='Invalid')r.errors=r.errors.concat(r.dupe);else if(r.status==='Duplicate')r.errors=r.dupe.slice();
  });
  const count=function(s){return rows.filter(function(r){return r.status===s;}).length;};
  const hash=ccHashText(JSON.stringify(data.map(function(x){return x.raw.slice(0,EMB_COLS.length);})));
  const prev=embBatchesHere().find(function(b){return b.hash===hash;});
  return {rows:rows,total:rows.length,valid:count('Valid'),invalid:count('Invalid'),duplicate:count('Duplicate'),hash:hash,
    sameAs:prev?{id:prev.id,at:prev.at}:null,company:entRec?entRec.name:''};
}

/* ── Creating ───────────────────────────────────────────────────────────── */
function embCreate(confirmed){
  if(!emb||!emb.result||emb.busy||emb.stage==='done')return;
  if(!emsCan('h2r.employee.bulk')){emsDeny('bulk upload employees');return;}
  if(emb.entityId!==idEntity()){embClose();return;}
  const r=emb.result;
  if(!r.valid)return;
  /* Partial import is an explicit, confirmed choice. */
  if(r.valid<r.total&&!confirmed){emb.confirm=true;embRender();return;}
  emb.busy=true;
  const ent=emb.entityId,s=stampNow(),actual=typeof idSwitched==='function'&&idSwitched()?idAuthMe():'';
  const b={id:'EBU-'+(embBatchNext++),entityId:ent,fileName:emb.file.name,fileSize:emb.file.size,hash:r.hash,at:s.date+' | '+s.time,
    by:idMe(),actual:actual,employeeStatus:emb.status,total:r.total,valid:r.valid,invalid:r.invalid,duplicate:r.duplicate,
    created:[],failed:[],rows:[],status:'Processing',logs:[]};
  embBatches.unshift(b);
  const via=actual?' (through Switch User by '+idName(actual)+')':'';
  b.logs.push({date:s.date,time:s.time,user:idName(b.by),userId:b.by,actualUserId:actual,status:'Processing',
    action:'Bulk upload of '+b.fileName+' started'+via+': '+r.total+' rows, '+r.valid+' valid, '+r.invalid+' invalid, '+r.duplicate+' duplicate; employee status '+b.employeeStatus+'.'});
  const taken={},made={};
  r.rows.forEach(function(x){
    if(x.status!=='Valid'){b.rows.push({n:x.n,name:x.name,email:x.d.email,result:x.status,empId:'',details:x.errors.map(function(e){return e.msg;}).join('; ')});return;}
    /* Checked again at creation: someone may have added the same person meanwhile. */
    const ex=eaEmailOwner(x.d.email,ent);
    if(ex){b.failed.push({n:x.n,error:'Employee record already exists'});b.rows.push({n:x.n,name:x.name,email:x.d.email,result:'Duplicate',empId:'',details:'Employee record already exists ('+ex.empId+')'});return;}
    const nid=eaNextEmpId('de',ent,taken),code=nid.prefix+nid.seq;taken[code]=1;
    const d=Object.assign({},x.d,{empId:code,status:b.employeeStatus,teams:[],manager:''});
    const rec=eaCreateEmployee(d,'de',{entityId:ent,managerEid:x.managerEid,actual:actual,
      action:'Employee created by bulk upload '+b.id+' ('+b.fileName+', row '+x.n+')'+via+(b.employeeStatus==='Pending'?' as Pending — onboarding has not started':' and onboarding started')
        +'. Date of Joining set to '+(cdLabel(d.doj)||'—')+'. No team assigned yet.'});
    made[String(x.d.email).toLowerCase()]=rec;
    b.created.push({n:x.n,eid:rec.eid,empId:rec.empId,name:rec.name});
    b.rows.push({n:x.n,name:rec.name,email:rec.email,result:'Created',empId:rec.empId,details:x.managerName?'Reporting Manager: '+x.managerName:''});
  });
  /* Managers that were rows of this same file. */
  r.rows.forEach(function(x){
    if(x.status!=='Valid'||!x.managerRow)return;
    const me=made[String(x.d.email).toLowerCase()],mr=r.rows.find(function(y){return y.n===x.managerRow;}),mgr=mr?made[String(mr.d.email).toLowerCase()]:null;
    if(me&&mgr)me.managerEid=mgr.eid;
  });
  const s2=stampNow();
  b.status=b.created.length===b.total?'Completed':b.created.length?'Completed with exceptions':'Not created';
  b.logs.push({date:s2.date,time:s2.time,user:idName(b.by),userId:b.by,actualUserId:actual,status:b.status,
    action:b.created.length+' employee'+(b.created.length===1?'':'s')+' created ('+(b.created.map(function(c){return c.empId;}).join(', ')||'none')+'); '
      +(b.total-b.created.length)+' not created.'});
  /* One notice to the uploader for the batch (never one per employee, never twice). */
  if(typeof notifData!=='undefined'&&!notifData.some(function(n){return n.evt==='emb:'+b.id;})){
    notifData.unshift({name:'Bulk upload '+b.id+': '+embDoneText(b),cid:b.id,time:'just now',pending:false,to:[b.by],entity:ent,evt:'emb:'+b.id});
    if(typeof notifSyncBell==='function')notifSyncBell();
  }
  emb.busy=false;emb.confirm=false;emb.stage='done';emb.batch=b;
  if(typeof page!=='undefined'&&(page==='employees'||page==='direct'||page==='global')){if(page==='employees')empSubTab='direct';deSelectedId=null;}
  if(typeof renderADTPage==='function')renderADTPage();
  embRender();
  showToast(b.created.length?'Employees created':'No employees created',b.created.length?'success':'error',embDoneText(b));
}

/* ══ EXCEL FILES: the format, the sample, errors and results ═══════════════
   Written with the app's own XLSX writer pieces (js/ts-export.js: tsxZip,
   tsxXmlEsc, tsxColLetter, tsxSave), with a style table of its own: headers in
   row 1, required headers in the app's navy, text cells for codes and numbers,
   date cells as YYYY-MM-DD, drop-downs from the company's own lists. */
const EMB_XLSX_STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
+'<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts>'
+'<fonts count="4">'
  +'<font><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>'
  +'<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>'
  +'<font><b/><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>'
  +'<font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/><family val="2"/></font>'
+'</fonts>'
+'<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
  +'<fill><patternFill patternType="solid"><fgColor rgb="FF1F3A5F"/><bgColor indexed="64"/></patternFill></fill>'
  +'<fill><patternFill patternType="solid"><fgColor rgb="FFE5E9F0"/><bgColor indexed="64"/></patternFill></fill>'
  +'<fill><patternFill patternType="solid"><fgColor rgb="FFFFF4E5"/><bgColor indexed="64"/></patternFill></fill></fills>'
+'<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
  +'<border><left style="thin"><color rgb="FFD0D5DD"/></left><right style="thin"><color rgb="FFD0D5DD"/></right><top style="thin"><color rgb="FFD0D5DD"/></top><bottom style="thin"><color rgb="FFD0D5DD"/></bottom><diagonal/></border></borders>'
+'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
+'<cellXfs count="10">'
  +'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'                                                                                                   /* 0 plain        */
  +'<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'  /* 1 head required */
  +'<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'  /* 2 head optional */
  +'<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'                                                                         /* 3 text         */
  +'<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'                                                                        /* 4 date         */
  +'<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' /* 5 guide cell */
  +'<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'                                                                                  /* 6 bold         */
  +'<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'                    /* 7 note         */
  +'<xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' /* 8 warning */
  +'<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' /* 9 guide head */
+'</cellXfs>'
+'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
+'</styleSheet>';
const EMB_S={plain:0,headReq:1,headOpt:2,text:3,date:4,cell:5,bold:6,note:7,warn:8,head:9};
function embCellXml(ref,c){
  if(c==null||c.v==null||c.v==='')return c&&c.s?'<c r="'+ref+'" s="'+c.s+'"/>':'';
  if(c.n)return '<c r="'+ref+'" s="'+(c.s||0)+'"><v>'+c.v+'</v></c>';
  return '<c r="'+ref+'" s="'+(c.s||0)+'" t="inlineStr"><is><t xml:space="preserve">'+tsxXmlEsc(c.v)+'</t></is></c>';
}
/* sheet: {name, cols:[{w,s}], rows:[[cell|string]], freeze, filter, dv:[{sqref,name,title}], rowHt:{r:ht}} */
function embSheetXml(sh){
  const nCols=Math.max(sh.cols.length,1),nRows=Math.max(sh.rows.length,1);
  let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    +'<dimension ref="A1:'+tsxColLetter(nCols)+nRows+'"/>'
    +'<sheetViews><sheetView workbookViewId="0"'+(sh.selected?' tabSelected="1"':'')+'>'
    +(sh.freeze?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>':'')
    +'</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>'
    +'<cols>'+sh.cols.map(function(c,i){return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+c.w+'" customWidth="1"'+(c.s?' style="'+c.s+'"':'')+'/>';}).join('')+'</cols>'
    +'<sheetData>'+sh.rows.map(function(row,ri){
      const ht=sh.rowHt&&sh.rowHt[ri+1];
      return '<row r="'+(ri+1)+'"'+(ht?' ht="'+ht+'" customHeight="1"':'')+'>'+row.map(function(c,ci){return embCellXml(tsxColLetter(ci+1)+(ri+1),typeof c==='string'?{v:c}:c);}).join('')+'</row>';
    }).join('')+'</sheetData>'
    +(sh.filter?'<autoFilter ref="'+sh.filter+'"/>':'');
  if(sh.dv&&sh.dv.length){
    x+='<dataValidations count="'+sh.dv.length+'">'+sh.dv.map(function(d){
      return '<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="'+tsxXmlEsc(d.title)+'" error="Pick a value from the list. See the Field Guide sheet." sqref="'+d.sqref+'"><formula1>'+d.name+'</formula1></dataValidation>';
    }).join('')+'</dataValidations>';
  }
  return x+'<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';
}
/* sheets as above; names: [{name, ref, sheet?, hidden?}] */
function embWorkbook(sheets,names){
  const types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    +'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    +sheets.map(function(s,i){return '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';}).join('')
    +'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
  const rootRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    +'<bookViews><workbookView activeTab="0"/></bookViews><sheets>'
    +sheets.map(function(s,i){return '<sheet name="'+tsxXmlEsc(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>';}).join('')+'</sheets>'
    +(names&&names.length?'<definedNames>'+names.map(function(n){return '<definedName name="'+n.name+'"'+(n.sheet!=null?' localSheetId="'+n.sheet+'"':'')+(n.hidden?' hidden="1"':'')+'>'+tsxXmlEsc(n.ref)+'</definedName>';}).join('')+'</definedNames>':'')
    +'</workbook>';
  const wbRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    +sheets.map(function(s,i){return '<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>';}).join('')
    +'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  const enc=function(s){return new TextEncoder().encode(s);};
  const files=[{name:'[Content_Types].xml',data:enc(types)},{name:'_rels/.rels',data:enc(rootRels)},{name:'xl/workbook.xml',data:enc(wb)},
    {name:'xl/_rels/workbook.xml.rels',data:enc(wbRels)},{name:'xl/styles.xml',data:enc(EMB_XLSX_STYLES)}];
  sheets.forEach(function(s,i){files.push({name:'xl/worksheets/sheet'+(i+1)+'.xml',data:enc(embSheetXml(s))});});
  return tsxZip(files);
}
/* Excel's day number for a YYYY-MM-DD date. */
function embSerial(iso){return Math.round((Date.parse(iso+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000);}
/* The three-sheet workbook: Employees (headers, then `rows`), Field Guide (with
   this company's valid values, which the Employees drop-downs read), Instructions. */
function embFormatBook(rows){
  const ent=embCompany(),L=embLists(),cols=EMB_COLS.length;
  const emp={name:'Employees',selected:true,freeze:true,filter:'A1:'+tsxColLetter(cols)+'1',rowHt:{1:32},
    cols:EMB_COLS.map(function(c){return {w:Math.max(14,Math.min(34,c.h.length+6))+(c.k==='email'||c.k==='manager'?10:0),s:c.date?EMB_S.date:EMB_S.text};}),
    rows:[EMB_COLS.map(function(c){return {v:c.h,s:c.req?EMB_S.headReq:EMB_S.headOpt};})].concat((rows||[]).map(function(r){
      return EMB_COLS.map(function(c){const v=r[c.k];if(c.date&&v&&/^\d{4}-\d{2}-\d{2}$/.test(v))return {v:embSerial(v),n:1,s:EMB_S.date};return {v:Array.isArray(v)?v.join('; '):(v||''),s:EMB_S.text};});
    })),dv:[]};
  /* Field Guide: one row per column, the note, then the company's lists. */
  const g=[[{v:'Column',s:EMB_S.head},{v:'Requirement',s:EMB_S.head},{v:'Purpose',s:EMB_S.head},{v:'Format',s:EMB_S.head},{v:'Validation',s:EMB_S.head},{v:'Notes',s:EMB_S.head}]];
  EMB_COLS.forEach(function(c,i){
    const extra=c.list==='country'&&L.country.length?' ('+L.country[0]+')':'';
    g.push([{v:tsxColLetter(i+1)+' – '+c.h,s:EMB_S.cell},{v:c.req?'Required':'Optional',s:EMB_S.cell},{v:c.purpose,s:EMB_S.cell},{v:c.fmt,s:EMB_S.cell},{v:c.val+extra,s:EMB_S.cell},{v:c.note||'',s:EMB_S.cell}]);
  });
  g.push([]);g.push([{v:EMB_GUIDE_NOTE,s:EMB_S.note}]);g.push([]);
  g.push([{v:'Valid values for '+(ent?ent.name:''),s:EMB_S.bold}]);
  const listHead=g.length+1;
  g.push(EMB_LISTS.map(function(l){return {v:l[1],s:EMB_S.head};}));
  const longest=Math.max.apply(null,EMB_LISTS.map(function(l){return L[l[0]].length;}).concat([1]));
  for(let i=0;i<longest;i++)g.push(EMB_LISTS.map(function(l){const v=L[l[0]][i];return v==null?null:{v:v,s:EMB_S.cell};}));
  const names=[{name:'_xlnm._FilterDatabase',ref:'Employees!$A$1:$'+tsxColLetter(cols)+'$1',sheet:0,hidden:true}];
  EMB_LISTS.forEach(function(l,li){
    const n=L[l[0]].length;if(!n||l[0]==='idProof')return;     // ID proofs take several values: no single-pick list
    const nm='EmbList_'+l[0],col=tsxColLetter(li+1);
    names.push({name:nm,ref:"'Field Guide'!$"+col+'$'+(listHead+1)+':$'+col+'$'+(listHead+n)});
    const ci=EMB_COLS.findIndex(function(c){return c.list===l[0];});
    if(ci>=0)emp.dv.push({sqref:tsxColLetter(ci+1)+'2:'+tsxColLetter(ci+1)+EMB_LAST_ROW,name:nm,title:EMB_COLS[ci].h});
  });
  const guide={name:'Field Guide',cols:[{w:30},{w:20},{w:34},{w:28},{w:46},{w:40},{w:16},{w:24},{w:18}],rows:g,freeze:true};
  const ins={name:'Instructions',cols:[{w:8},{w:110}],freeze:true,
    rows:[[{v:'Step',s:EMB_S.head},{v:'Instruction',s:EMB_S.head}]].concat(EMB_STEPS.map(function(t,i){return [{v:String(i+1),s:EMB_S.cell},{v:t,s:EMB_S.cell}];}))
      .concat([[],[{v:'Note',s:EMB_S.warn},{v:EMB_WARNING,s:EMB_S.warn}]])};
  return embWorkbook([emp,guide,ins],names);
}
function embFileName(kind){const ent=embCompany();return 'Employee Bulk Upload '+kind+' - '+String(ent?ent.name:'Company').replace(/[\\\/:*?"<>|]/g,' ')+'.xlsx';}
function embDownloadFormat(){
  if(!emsCan('h2r.employee.bulk')){emsDeny('download the employee upload format');return;}
  tsxSave(embFormatBook([]),embFileName('Format'));
  showToast('Format downloaded','success',embFileName('Format'));
}
/* Fourteen sample employees (product owner, 13 Nov 2026), with this company's own valid values.
   The first row stays first: the presentation builds its company from it. */
function embSampleRows(){
  const L=embLists();
  if(!L.dept.length||!L.desig.length||!L.country.length)return null;
  /* The specified value when the company has it; else one whose word starts the same way; else the first. */
  const like=function(list,want,word){return embPick(list,want)||list.find(function(x){return word&&x.toLowerCase().split(/[\s\-—]+/).some(function(w){return w.indexOf(word)===0;});})||list[0];};
  const base=[['Isha','Rao','isha.rao.sample01@example.com','9999900001','2026-11-16','Operations','op','Operations Associate','op','Hyderabad','hyd','Female','1996-04-12'],
    ['Aditya','Sen','aditya.sen.sample02@example.com','9999900002','2026-11-17','Finance','fin','Finance Associate','financ','Hyderabad','hyd','Male','1994-09-03'],
    ['Maya','Nair','maya.nair.sample03@example.com','9999900003','2026-11-18','Operations','ops','Analyst','analyst','Bengaluru','bang','Female','1997-01-25'],
    ['Rohan','Das','rohan.das.sample04@example.com','9999900004','2026-11-19','Sales','sales','Sales Executive','sales','Mumbai','mum','Male','1995-06-21'],
    ['Priya','Menon','priya.menon.sample05@example.com','9999900005','2026-11-20','Human Resources','human','HR Executive','hr','Delhi','del','Female','1993-11-08'],
    ['Karan','Mehta','karan.mehta.sample06@example.com','9999900006','2026-11-23','Administration','admin','Admin Executive','admin','Hyderabad','hyd','Male','1992-02-14'],
    ['Sneha','Iyer','sneha.iyer.sample07@example.com','9999900007','2026-11-24','Technology','tech','Software Engineer','software','Bengaluru','bang','Female','1998-07-30'],
    ['Vikram','Singh','vikram.singh.sample08@example.com','9999900008','2026-11-25','Marketing','market','Marketing Executive','market','Mumbai','mum','Male','1996-03-17'],
    ['Ananya','Ghosh','ananya.ghosh.sample09@example.com','9999900009','2026-11-26','Finance','fin','Accountant','account','Delhi','del','Female','1995-10-05'],
    ['Arjun','Patel','arjun.patel.sample10@example.com','9999900010','2026-11-27','Operations','op','Operations Executive','op','Hyderabad','hyd','Male','1994-12-22'],
    ['Neha','Joshi','neha.joshi.sample11@example.com','9999900011','2026-11-30','Sales','sales','Sales Manager','sales','Bengaluru','bang','Female','1990-08-13'],
    ['Rahul','Kumar','rahul.kumar.sample12@example.com','9999900012','2026-12-01','Technology','tech','Analyst','analyst','Remote — India','remote','Male','1997-05-09'],
    ['Divya','Pillai','divya.pillai.sample13@example.com','9999900013','2026-12-02','Human Resources','human','Recruiter','recruit','Hyderabad','hyd','Female','1996-01-28'],
    ['Sameer','Khan','sameer.khan.sample14@example.com','9999900014','2026-12-03','Operations','op','Team Lead','lead','Punjab','pun','Male','1991-09-19']];
  return base.map(function(b){
    return {fname:b[0],lname:b[1],email:b[2],dial:embPick(L.dial,'+91')||L.dial[0],phone:b[3],country:L.country[0],doj:b[4],empType:embPick(L.empType,'Full Time')||L.empType[0],
      dept:like(L.dept,b[5],b[6]),designation:like(L.desig,b[7],b[8]),manager:'',location:like(L.location,b[9],b[10]),gender:embPick(L.gender,b[11])||L.gender[0],dob:b[12],
      nationality:embPick(L.nationality,L.country[0])||L.nationality[0],idProofs:['PAN Card','Aadhar Card'].filter(function(p){return L.idProof.indexOf(p)>=0;})};
  });
}
function embDownloadSample(){
  if(!emsCan('h2r.employee.bulk')){emsDeny('download the sample');return;}
  const rows=embSampleRows();
  if(!rows){showToast('Company Structure is not set up','error','Add departments and designations under Administration → Company Structure first.');return;}
  tsxSave(embFormatBook(rows),embFileName('Sample'));
  showToast('Sample downloaded','success',embFileName('Sample'));
}
function embSimpleBook(sheetName,head,rows){
  return embWorkbook([{name:sheetName,freeze:true,selected:true,filter:'A1:'+tsxColLetter(head.length)+'1',cols:head.map(function(h){return {w:h[1]};}),
    rows:[head.map(function(h){return {v:h[0],s:EMB_S.head};})].concat(rows.map(function(r){return r.map(function(v){return {v:v==null?'':String(v),s:EMB_S.cell};});}))}],
    [{name:'_xlnm._FilterDatabase',ref:"'"+sheetName+"'!$A$1:$"+tsxColLetter(head.length)+'$1',sheet:0,hidden:true}]);
}
function embDownloadErrors(){
  if(!emb||!emb.result)return;
  const rows=[];
  emb.result.rows.forEach(function(x){if(x.status==='Valid')return;x.errors.forEach(function(e){rows.push([x.n,x.name,x.d.email,e.field,e.msg]);});});
  const name='Employee Upload Errors - '+String(emb.file?emb.file.name:'file').replace(/\.xlsx$/i,'')+'.xlsx';
  tsxSave(embSimpleBook('Errors',[['Row',8],['Employee',26],['Work Email',34],['Field',24],['Error',60]],rows),name);
  showToast('Errors downloaded','success',name);
}
function embDownloadResults(id){
  const b=embBatches.find(function(x){return x.id===id&&x.entityId===idEntity();});if(!b)return;
  const name='Employee Upload Results - '+b.id+'.xlsx';
  tsxSave(embSimpleBook('Results',[['Row',8],['Employee',26],['Work Email',34],['Result',14],['Employee ID',14],['Details',60]],
    b.rows.map(function(x){return [x.n,x.name,x.email,x.result==='Created'?'Created':x.result==='Duplicate'?'Duplicate':'Not created',x.empId,x.details];})),name);
  showToast('Results downloaded','success',name);
}

/* Closing on company switch is handled in embRender; a page change keeps the popup. */
window.embPlusClick=embPlusClick;
