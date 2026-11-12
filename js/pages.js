/* ══ ATTACHMENTS TAB ═══════════════════════════════════════════════════════
   ONE attachments tab, used by every detail panel that has one. There were
   nine, hand-rolled with slightly different inline styles, and not one of them
   did anything: "Add Attachment" and "Download All" were unwired buttons over
   a bare table whose only row said "No attachments." A control that promises
   an action and performs none is worse than no control.

   The design is deliberately plain, because an attachments tab has exactly two
   states and neither needs decoration:
     EMPTY   a drop zone that says what it takes and how to give it. The whole
             panel is the target, not a 90px button in the corner — the empty
             state IS the affordance, so there is nothing else competing for
             the click.
     FILLED  the same list every other table in the app uses, with the drop
             zone demoted to a slim bar above it so adding a second file is
             still one click and still accepts a drag.

   Drag-and-drop and the file picker land in the same place, because they are
   the same intent. Nothing here uploads — there is no server — so a file is
   recorded by name, size and type, which is what the list displays anyway. */
const ATTACH_SCOPES={
  de:      {find:function(id){return directEmpData.find(function(x){return x.id===id;});}},
  ge:      {find:function(id){return globalEmpData.find(function(x){return x.id===id;});}},
  pm:      {find:function(id){return paymentsData.find(function(x){return x.id===id;});}},
  cmp:     {find:function(id){return complianceItemsData.find(function(x){return x.id===id;});}},
  oca:     {find:function(id){return ocaItems.find(function(x){return x.id===id;});}},
  ctp:     {find:function(id){return contractTemplatesData.find(function(x){return x.id===id;});}},
  tk:      {find:function(id){return ticketsData.find(function(x){return x.id===id;});}},
  chat:    {find:function(id){return chatsData.find(function(x){return x.id===id;});}},
  // Company Settings has one entity, not a list, so its files hang off a
  // module-level record rather than a row.
  cs:      {find:function(){return csAttachHost;}}
};
var csAttachHost={id:'entity',attachments:[]};

function attachRec(scope,id){
  const s=ATTACH_SCOPES[scope];if(!s)return null;
  const rec=s.find(id);if(!rec)return null;
  if(!rec.attachments)rec.attachments=[];      // older fixtures predate the field
  return rec;
}
function attachFmtSize(bytes){
  if(!bytes&&bytes!==0)return '—';
  if(bytes<1024)return bytes+' B';
  if(bytes<1048576)return Math.round(bytes/1024)+' KB';
  return (bytes/1048576).toFixed(1)+' MB';
}
function attachKind(name){
  const e=String(name).split('.').pop().toLowerCase();
  if(/^(pdf)$/.test(e))return 'PDF';
  if(/^(png|jpg|jpeg|gif|webp|svg)$/.test(e))return 'Image';
  if(/^(doc|docx)$/.test(e))return 'Document';
  if(/^(xls|xlsx|csv)$/.test(e))return 'Spreadsheet';
  return e?e.toUpperCase():'File';
}
// The picker and a drop both end here, so one path validates and records.
function attachCommit(scope,id,fileList){
  const rec=attachRec(scope,id);if(!rec||!fileList||!fileList.length)return;
  const s=stampNow();
  const added=[];
  Array.prototype.forEach.call(fileList,function(f){
    if(f.size>10*1024*1024){                   // said out loud, not silently dropped
      showToast('File too large','error','"'+sbEsc(f.name)+'" is over the 10 MB limit.');return;
    }
    const att={name:f.name,size:attachFmtSize(f.size),type:attachKind(f.name),
      by:CURRENT_USER,source:'Manual upload',date:s.date};
    /* An uploaded file that can be e-signed needs an identity of its own: its
       position in this list shifts every time another file is added or removed,
       so the index it happens to sit at is not something a DocuSeal submission
       can be stored against. esStampUpload() gives it a uid, decides whether
       signing applies to this kind of file, and creates its e-sign record. */
    if(typeof esStampUpload==='function')esStampUpload(att);
    rec.attachments.unshift(att);
    added.push(f.name);
  });
  if(!added.length)return;
  renderADTPage();
  showToast(added.length===1?'Attachment added':'Attachments added','success',
    added.length===1?sbEsc(added[0]):added.length+' files added.');
}
// A hidden input per scope+record, created on demand. Reusing one input across
// records would carry the previous selection into the next panel.
function attachPick(scope,id){
  const inp=document.createElement('input');
  inp.type='file';inp.multiple=true;
  inp.addEventListener('change',function(){attachCommit(scope,id,inp.files);});
  inp.click();
}
function attachRemove(scope,id,i){
  const rec=attachRec(scope,id);if(!rec)return;
  const gone=rec.attachments[i];if(!gone)return;
  rec.attachments.splice(i,1);
  renderADTPage();
  showToast('Attachment removed','success','"'+sbEsc(gone.name)+'" was removed.');
}
function attachDownloadAll(scope,id){
  const rec=attachRec(scope,id);if(!rec||!rec.attachments.length)return;
  showToast('Preparing download','success',rec.attachments.length+' files will be zipped.');
}
function attachOpen(name){showToast('Opening attachment','success',sbEsc(name));}
// Drag feedback lives on a class rather than inline styles so the zone can be
// restyled in one place.
function attachDrag(e,on){e.preventDefault();e.currentTarget.classList.toggle('is-over',on);}
// The zone is the ONLY way to add a file, so it has to answer the keyboard as
// well as the mouse - it is exposed as a button, so it behaves like one.
function attachKey(e,scope,id){
  if(e.key!=='Enter'&&e.key!==' ')return;
  e.preventDefault();attachPick(scope,id);
}
function attachDrop(e,scope,id){
  e.preventDefault();e.currentTarget.classList.remove('is-over');
  attachCommit(scope,id,e.dataTransfer&&e.dataTransfer.files);
}

function attachTabHTML(scope,id){
  const rec=attachRec(scope,id);
  const files=rec?rec.attachments:[];
  const dz='ondragover="attachDrag(event,true)" ondragleave="attachDrag(event,false)" '
    +'ondrop="attachDrop(event,\''+scope+'\','+JSON.stringify(id)+')" '
    +'onclick="attachPick(\''+scope+'\','+JSON.stringify(id)+')" '
    +'onkeydown="attachKey(event,\''+scope+'\','+JSON.stringify(id)+')" '
    +'role="button" tabindex="0"';
  const iUp='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  const iDl='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const iX='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';

  if(!files.length){
    // The empty state IS the control. No separate button to compete with it.
    return '<div class="att-zone att-zone-lg" '+dz+'>'
      +'<div class="att-zone-ico">'+iUp+'</div>'
      +'<div class="att-zone-title">Drop files here, or click to browse</div>'
      +'<div class="att-zone-hint">PDF, images, documents and spreadsheets · up to 10 MB each</div>'
      +'</div>';
  }
  const thS='padding:9px 12px;text-align:left;font-size:10.5px;font-weight:600;color:#6b7280;background:#f8fafc;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap';
  const tdS='padding:10px 12px;font-size:12.5px;color:var(--navy);border-bottom:1px solid #f1f3f5;vertical-align:middle';
  const rows=files.map(function(f,i){
    return '<tr>'
      +'<td style="'+tdS+';color:var(--gray)">'+(i+1)+'</td>'
      +'<td style="'+tdS+'"><div class="lp-c-main">'+sbEsc(f.name)+'</div>'
        +'<div class="lp-c-sub">'+(f.size||'—')+'</div></td>'
      +'<td style="'+tdS+'">'+sbEsc(f.by||'—')+'</td>'
      +'<td style="'+tdS+'"><span class="att-kind">'+sbEsc(f.type||attachKind(f.name))+'</span></td>'
      +'<td style="'+tdS+';white-space:nowrap;color:#64748b;font-size:11.5px">'+sbEsc(f.source||'—')+'</td>'
      +'<td style="'+tdS+';text-align:right;white-space:nowrap">'
        +'<button class="att-row-btn" title="Download" onclick="attachOpen('+attrSafe(JSON.stringify(f.name))+')">'+iDl+'</button>'
        +'<button class="att-row-btn is-danger" title="Remove" onclick="attachRemove(\''+scope+'\','+JSON.stringify(id)+','+i+')">'+iX+'</button>'
      +'</td></tr>';
  }).join('');
  return '<div class="att-bar">'
      +'<span class="att-count">'+files.length+' file'+(files.length===1?'':'s')+'</span>'
      +'<div class="att-bar-actions">'
      +'<button class="att-link" onclick="attachDownloadAll(\''+scope+'\','+JSON.stringify(id)+')">'+iDl+'Download All</button>'
      +'</div></div>'
    +'<div class="att-zone att-zone-sm" '+dz+'>'
      +'<span class="att-zone-ico-sm">'+iUp+'</span>'
      +'<span>Drop files here, or click to browse</span></div>'
    +'<div class="att-table-wrap"><table class="att-table"><thead><tr>'
      +'<th style="'+thS+'">Sr. No</th><th style="'+thS+'">File Name</th><th style="'+thS+'">Uploaded By</th>'
      +'<th style="'+thS+'">Type</th><th style="'+thS+'">Source</th><th style="'+thS+';text-align:right">Action</th>'
      +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

/* Bank Details tab (Direct + Global employees): the same bar and table as the
   Attachments tab, so the panel's listings read alike. */
function bankTabHTML(rows){
  const plusSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const dash='<span style="color:var(--gray)">—</span>';
  const n=rows.length;
  return '<div class="att-bar">'
      +'<span class="att-count">'+n+' account'+(n===1?'':'s')+'</span>'
      +'<div class="att-bar-actions"><button class="att-link">'+plusSvg+'Add Bank Detail</button></div>'
    +'</div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr>'
      +'<th>Sr. No</th><th>Location</th><th>Pay Name</th><th>Pay Bank</th>'
    +'</tr></thead><tbody>'
    +rows.map(function(r,i){
      return '<tr>'
        +'<td class="csag-td csag-num">'+(i+1)+'</td>'
        +'<td class="csag-td">'+(r.loc?sbEsc(r.loc):dash)+'</td>'
        +'<td class="csag-td">'+(r.pay?sbEsc(r.pay):dash)+'</td>'
        +'<td class="csag-td">'+(r.bank?sbEsc(r.bank):dash)+'</td>'
      +'</tr>';
    }).join('')
    +'</tbody></table></div>';
}
// Salary Details tab's "Salary Schedule" (Direct + Global employees).
function salScheduleTableHTML(){
  return '<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr>'
      +'<th>Sr. No</th><th>Salary From</th><th>Salary To</th><th>Amount</th>'
    +'</tr></thead><tbody><tr><td colspan="4" class="csag-td csag-empty">No salary history</td></tr></tbody></table></div>';
}

function openDeSidebar(id){
  if(deSelectedId!=null&&String(deSelectedId)!==String(id)&&sbLeaveGuard('de',function(){openDeSidebar(id);}))return;
  deTab=sbKeepTab(deSelectedId,deTab);deSelectedId=id;deEditMode=false;
  const sb=document.getElementById('de-split-sb');if(sb)sb.classList.add('open');
  isbTab('de',renderDeSidebar);   // body-only swap when the panel is already open
  document.querySelectorAll('.de-row').forEach(r=>r.classList.toggle('lp-row-selected',r.id==='de-row-'+id));
}
function closeDeSidebar(){if(sbLeaveGuard('de',closeDeSidebar))return;
  deSelectedId=null;deEditMode=false;
  const sb=document.getElementById('de-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.de-row').forEach(r=>r.classList.remove('lp-row-selected'));
}
function navDeTab(tab){deTab=tab;if(!sbHasDraft('de'))deEditMode=false;isbTab('de',renderDeSidebar);}
function scrollTabRow(dir,id){const el=document.getElementById(id);if(!el)return;const t=el.querySelector('.lp-isb-tab');const w=t?t.offsetWidth*2+32:160;el.scrollBy({left:dir==='right'?w:-w,behavior:'smooth'});}
function deToggleStatFilter(v){
  deStatusFilter=deStatusFilter===v?'':v;
  deSelectedId=null;renderADTPage();
}
function applyDeFilters(){
  const dept=getCSValue('de-f-dept'),branch=getCSValue('de-f-branch'),status=getCSValue('de-f-status');
  deDeptFilter=dept&&dept!=='Department'?dept:'';
  deBranchFilter=branch&&branch!=='Branch'?branch:'';
  deStatusFilter=status&&status!=='Status'?status:'';
  deSearchQuery=lpSearchValue('de-f-q');
  deSelectedId=null;renderADTPage();
}
function resetDeFilters(){deDeptFilter='';deBranchFilter='';deStatusFilter='';deSearchQuery='';deSelectedId=null;renderADTPage();}
function renderDeSidebar(){
  const editBtn='<button class="lp-sb-view-edit-btn" onclick="startDeEdit()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>';
  const emp=directEmpData.find(e=>e.id===deSelectedId);if(!emp)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'bank-details',label:'Bank Details'},{id:'attachments',label:'Attachments'},{id:'salary-details',label:'Salary Details'},{id:'leaves-holidays',label:'Leaves'},{id:'workflow',label:'Workflow'}]
    .concat(typeof deExtraTabs==='function'?deExtraTabs(emp):[]);   // ONC Card (js/onc-enrollment.js)
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'de-isb-tabs\')" title="Scroll left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>'
    +'<div class="lp-isb-tabs" id="de-isb-tabs">'+tabs.map(t=>'<button class="lp-isb-tab'+(deTab===t.id?' active':'')+'" onclick="navDeTab(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'de-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeDeSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const d='<span style="color:#9ca3af">--</span>';
  const v=(x)=>x&&x!=='--'?x:d;
  const iP='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iB='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>';
  const iI='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h4"/></svg>';
  const iPin='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  const iBag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>';
  const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iDoc='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  const iPhone='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.2.73.43 1.44.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.9-.87a2 2 0 0 1 2.11-.45c1.37.27 2.08.5 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>';
  const iMail='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  const fc=(ico,label,val)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
  let body='';
  if(deTab==='basic-details'&&deEditMode){
    body=sbHero({icon:sbIco.user,name:emp.name,meta:[emp.empId,emp.jobTitle,emp.dept],status:empLifeBadge(emp.status),editing:true})
      +(typeof epFormHTML==='function'?epFormHTML('desb',emp,'admin','cancelDeEdit','saveDeEdit'):buildSbEditForm('desb',DE_EDIT_FIELDS,emp,'cancelDeEdit','saveDeEdit'));
  }else if(deTab==='basic-details'){
    body=sbHero({icon:sbIco.user,name:emp.name,meta:[emp.empId,emp.jobTitle,emp.dept],status:empLifeBadge(emp.status),edit:(typeof epCanAdmin==='function'?epCanAdmin(emp):(typeof emsCan!=='function'||emsCan('h2r.employee.manage')))?editBtn:''})
      +'<div class="lp-sb-detail-grid">'
      +fc(iP,'Name',v(emp.name))+fc(iB,'Department',v(emp.dept))
      +fc(iI,'Employee ID',v(emp.empId))+fc(iPin,'Branch',v(emp.branch))
      +fc(iBag,'Job Title',v(emp.jobTitle))+fc(iCal,'Joining Date',v(emp.joinDate))
      +fc(iDoc,'Description',v(emp.desc))+fc(iPhone,'Contact Number',v(emp.contact))
      +fc(iMail,'Email',v(emp.email))+fc(iP,'Reporting Manager',v(emp.managerEid&&typeof idEmpName==='function'?idEmpName(emp.managerEid):''))
      +'</div>'+(typeof epPanelExtraHTML==='function'?epPanelExtraHTML(emp):'');
  }else if(deTab==='benefits'){
    body=oncBenefitsTabHTML(emp);
  }else if(deTab==='onc-card'){
    body=oncTabHTML(emp);
  }else if(deTab==='bank-details'){
    const bankData=[
      {loc:'INDIA',pay:'',bank:'ICICI'},
      {loc:'INDIA',pay:'',bank:''},
      {loc:'',pay:'Bhavesh Shah',bank:''},
      {loc:'IND',pay:'Pritesh S',bank:'HDFC'},
      {loc:'IND',pay:'Samantha K',bank:'SBI'},
      {loc:'IND',pay:'Deepak K',bank:'ICICI'},
      {loc:'Germany',pay:'Deena Davloy',bank:'Deutsche Bank'}
    ];
    body=bankTabHTML(bankData);
  }else if(deTab==='attachments'){
    body=attachTabHTML('de',deSelectedId);
  }else if(deTab==='salary-details'){
    body='<div style="margin-bottom:16px">'
        +'<div style="font-size:15px;font-weight:700;color:var(--navy)">Salary Details</div>'
        +'<div style="font-size:12px;color:var(--orange);margin-top:2px">Configure employee payment details</div>'
      +'</div>'
      // 1. Core Details card
      +'<div class="ep-form-card" style="margin-bottom:14px">'
        +'<div class="ep-form-title">Core Details</div>'
        +'<div class="ep-form-grid">'
          +'<div class="ep-form-group"><label class="ep-form-label">Base Salary <span class="req">*</span></label><input class="ep-form-input" type="number" placeholder="Enter base salary"></div>'
          +'<div class="ep-form-group"><label class="ep-form-label">Pay Frequency <span class="req">*</span></label>'+apCS('de-sal-payfreq',['Monthly','Biweekly','Weekly'],'','Select frequency')+'</div>'
          +'<div class="ep-form-group"><label class="ep-form-label">Effective Date</label>'+apCD('ph-eff-date-1','','Select date')+'</div>'
          +'<div class="ep-form-group"><label class="ep-form-label">Currency</label>'+apCS('de-sal-currency',['INR (₹)','USD ($)','EUR (€)','GBP (£)'],'INR (₹)','INR (₹)')+'</div>'
        +'</div>'
      +'</div>'
      // 2. Earnings | Deductions side by side
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
        +'<div class="ep-form-card" style="padding:14px">'
          +'<div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px">Earnings</div>'
          +'<div style="color:var(--orange);font-size:12px;margin-bottom:4px">Base Salary is not set.</div>'
          +'<div style="color:#9ca3af;font-size:12px">No earnings payheads assigned</div>'
        +'</div>'
        +'<div class="ep-form-card" style="padding:14px">'
          +'<div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px">Deductions</div>'
          +'<div style="color:var(--orange);font-size:12px;margin-bottom:4px">Base Salary is not set.</div>'
          +'<div style="color:#9ca3af;font-size:12px">No deduction payheads assigned</div>'
        +'</div>'
      +'</div>'
      // 3. Assign Payheads
      +'<div class="ep-form-card" style="margin-bottom:14px">'
        +'<div class="ep-form-title">Assign Payheads</div>'
        +'<div style="color:#9ca3af;font-size:12px;margin-bottom:10px">No payheads assigned</div>'
        +'<label class="ep-form-label" style="display:block;margin-bottom:6px">Select Additional Payheads</label>'
        +'<div class="ep-emp-search"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search payheads..."></div>'
      +'</div>'
      // 4. Net Salary
      +'<div class="ep-form-card" style="background:#fffbf5;border-color:#fde68a;padding:16px 22px;margin-bottom:14px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center">'
          +'<span style="font-size:14px;font-weight:700;color:var(--navy)">Net Salary</span>'
          +'<span style="color:var(--orange);font-weight:700;font-size:20px">--</span>'
        +'</div>'
      +'</div>'
      // 5. Salary Schedule history
      +'<div class="ep-form-card" style="margin-bottom:16px">'
        +'<div class="ep-form-title">Salary Schedule</div>'
        +salScheduleTableHTML()
      +'</div>'
      +'<div style="display:flex;justify-content:flex-end;gap:10px">'
        +'<button class="ep-cancel-btn">Cancel</button>'
        +'<button class="ep-save-btn">Save</button>'
      +'</div>';
  }else if(deTab==='leaves-holidays'){
    body=lhPanelHTML('de',emp.name);
  }else if(deTab==='history'){
    body=sbHistoryHTML(emp);
  }else if(deTab==='logs'){
    body=renderEmpLogsTab('de',emp);
  }else if(deTab==='workflow'){
    /* While onboarding or offboarding runs, every step of it - done, in
       progress, still to come (empWorkflowSteps); otherwise the record's history. */
    body=wfTimelineHTML(empWorkflowSteps(emp)||deWorkflowData[emp.id]||[]);
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
/* ── EMPLOYEE QUICK FILTERS ───────────────────────────────────────────────
   A team or a holiday has two or three statuses and a tile per status is the
   whole story. An employee has twelve, and eleven of them are stages of two
   journeys - so a tile per status would be a second filter bar, and one per
   JOURNEY is what the listing is actually asked: who is joining, who is here,
   who is leaving, who has gone.

   The two group values ride on the same variable as a real status, the way the
   Tickets listing rides __unassigned__ on tkQuickStatusFilter. They are marked
   with __ so nothing mistakes one for a status a record could carry, and the
   Status dropdown shows its placeholder while a group is selected - it has no
   option that means 'any of these five'. */
/* Status tiles and the Offboarding group live in employee-lifecycle.js
   (empStatTilesHTML / empStatMatch). */
/* The rows each tab shows, filters and search applied — one function per tab
   so the table and its Export can never disagree about what "the list" is. */
function deListRows(){
  let rows=typeof emsScopeEmployees==='function'?emsScopeEmployees(directEmpData):directEmpData;
  if(deDeptFilter)rows=rows.filter(e=>e.dept===deDeptFilter);
  if(deBranchFilter)rows=rows.filter(e=>e.branch===deBranchFilter);
  if(deStatusFilter)rows=rows.filter(e=>empStatMatch(e,deStatusFilter));
  return rows;
}
function geListRows(){
  /* The same entity and record scope as the Direct list (js/ems-access.js). */
  const rows=typeof emsScopeEmployees==='function'?emsScopeEmployees(globalEmpData):globalEmpData;
  return geStatusFilter?rows.filter(e=>empStatMatch(e,geStatusFilter)):rows;
}
/* ── EXPORT: ONE CLICK, NO OPTIONS ──
   Downloads exactly what the listing is showing — the tab you are on, with
   its filters and search, every page of it — as an .xlsx, through the same
   writer the timesheet export uses (tsxWorkbook / tsxSave in ts-export.js). */
const EMP_EXPORT={
  de:{title:'Direct Employees',rows:function(){return lpSearchRows(deListRows(),deSearchQuery);},
    filters:function(){return [deDeptFilter&&'Department: '+deDeptFilter,deBranchFilter&&'Branch: '+deBranchFilter,
      deStatusFilter&&'Status: '+empStatFilterLabel(deStatusFilter),deSearchQuery&&'Search: "'+deSearchQuery+'"'];},
    cols:[['Name','name',24],['Employee ID','empId',14],['Job Title','jobTitle',24],['Department','dept',16],['Branch','branch',14],
      ['Joining Date','joinDate',14],['Email','email',28],['Contact Number','contact',18],['Status','status',18]]},
  ge:{title:'Global Employees',rows:function(){return lpSearchRows(geListRows(),geSearchQuery);},
    filters:function(){return [geStatusFilter&&'Status: '+empStatFilterLabel(geStatusFilter),geSearchQuery&&'Search: "'+geSearchQuery+'"'];},
    cols:[['Name','name',24],['Employee ID','empId',14],['Country','country',16],['Job Title','jobTitle',24],['Worker Type','workerType',14],
      ['Joining Date','joinDate',14],['Email','email',28],['Contact Number','contact',18],['Status','status',18]]}
};
function empStatFilterLabel(v){return empStatIsGroup(v)?EMP_STAT_GROUPS[v]:v;}
function empExportBtn(kind){
  return '<button type="button" class="tsx-open-btn" onclick="empExport(\''+kind+'\')" title="Download this list as an Excel file">'
    +TSX_ICO.download+'Export</button>';
}
function empExport(kind){
  const cfg=EMP_EXPORT[kind];if(!cfg)return;
  const list=cfg.rows();
  if(!list.length){showToast('Nothing to export','info','No employees match the current filters.');return;}
  const s=stampNow();
  const applied=cfg.filters().filter(Boolean);
  const sheet={name:cfg.title,title:cfg.title,
    meta:['Exported '+s.date+', '+s.time+' · '+list.length+' employee'+(list.length===1?'':'s'),
      applied.length?'Filters: '+applied.join(' · '):'All employees — no filters applied'],
    columns:[{label:'S. No',w:7,num:1}].concat(cfg.cols.map(function(c){return {label:c[0],w:c[2]};})),
    rows:list.map(function(e,i){
      return [i+1].concat(cfg.cols.map(function(c){const v=e[c[1]];return v==null||v===''||v==='--'?'—':String(v);}));
    })};
  try{
    const d=new Date(),pad=function(n){return String(n).padStart(2,'0');};
    tsxSave(tsxWorkbook([sheet]),cfg.title.replace(/ /g,'_')+'_'+d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'.xlsx');
  }catch(err){
    console.error('Employee export failed',err);
    showToast('Export failed','error','The file could not be created.');return;
  }
  const noun=cfg.title.toLowerCase();
  showToast('Export ready','success',list.length+' '+(list.length===1?noun.replace(/s$/,''):noun)+' downloaded as Excel.');
}
function buildDirectListingHTML(){
  const d='<span style="color:#9ca3af">--</span>';
  const deRows=deListRows();
  if(deSelectedId&&!deRows.some(e=>e.id===deSelectedId))deSelectedId=null;
  const pgn=listPage('direct-employees',[deDeptFilter,deBranchFilter,deStatusFilter,deSearchQuery].join('|'),lpSearchRows(deRows,deSearchQuery).map((e,i)=>'<tr class="de-row'+(deSelectedId===e.id?' lp-row-selected':'')+'" id="de-row-'+e.id+'" style="cursor:pointer" onclick="openDeSidebar('+e.id+')">'
    +'<td style="color:var(--gray);font-size:13px">'+(i+1)+'</td>'
    +'<td><div class="lp-c-main">'+e.name+'</div><div class="lp-c-sub">'+(e.empId||'—')+'</div></td>'
    +'<td>'+(e.jobTitle||d)+'</td>'
    +'<td>'+(e.dept||d)+'</td>'
    +'<td>'+(e.branch||d)+'</td>'
    +'<td>'+empLifeBadge(e.status)+'</td>'
    +'<td onclick="event.stopPropagation()">'+empActionCellHTML('de',e)+'</td>'
    +'</tr>'),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No employees match this filter.</td></tr>');
  const sbInner=deSelectedId?renderDeSidebar():'';
  return '<div class="lp-page">'
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('de-f-q',deSearchQuery,'Search name, ID','applyDeFilters()')
    +apCS('de-f-dept',['Engineering','HR','Product','Design','Sales'],deDeptFilter,'Department')
    +apCS('de-f-branch',['Hyderabad','Mumbai','Delhi','Punjab','Bangalore'],deBranchFilter,'Branch')
    /* All eight rungs, not just the two that mean "employed" - filtering on
       Active/Inactive alone cannot find a record stuck in verification, which
       is the search HR actually runs. */
    +apCS('de-f-status',EMP_STATUSES,empStatIsGroup(deStatusFilter)?'':deStatusFilter,'Status')
    +clearFiltersBtn([deDeptFilter,deBranchFilter,deStatusFilter,deSearchQuery],'resetDeFilters()')
    +'<button class="lp-pill-search" onclick="applyDeFilters()">Search</button>'
    +empExportBtn('de')
    +'</div></div>'
    +empStatTilesHTML(typeof emsScopeEmployees==='function'?emsScopeEmployees(directEmpData):directEmpData,deStatusFilter,'deToggleStatFilter')
    +'</div>'
    +'<div class="lp-split-wrap" style="margin-top:14px"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr>'
    +'<th>SR. NO</th><th>NAME</th><th>JOB TITLE</th><th>DEPARTMENT</th><th>BRANCH</th><th>STATUS</th><th>ACTION</th>'
    +'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(deSelectedId?' open':'')+'" id="de-split-sb"><div class="lp-isb" id="de-isb-inner">'+sbInner+'</div></div>'
    +'</div></div>'
    +buildEmpStatusModalHTML('de')
    +buildAddEmployeeModalHTML('de')
    +buildAddTeamModalHTML();
}
function openGeSidebar(id){
  if(geSelectedId!=null&&String(geSelectedId)!==String(id)&&sbLeaveGuard('ge',function(){openGeSidebar(id);}))return;
  geTab=sbKeepTab(geSelectedId,geTab);geSelectedId=id;geEditMode=false;
  const sb=document.getElementById('ge-split-sb');if(sb)sb.classList.add('open');
  isbTab('ge',renderGeSidebar);   // body-only swap when the panel is already open
  document.querySelectorAll('.ge-row').forEach(r=>r.classList.toggle('lp-row-selected',r.id==='ge-row-'+id));
}
function closeGeSidebar(){if(sbLeaveGuard('ge',closeGeSidebar))return;
  geSelectedId=null;geEditMode=false;
  const sb=document.getElementById('ge-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.ge-row').forEach(r=>r.classList.remove('lp-row-selected'));
}
function navGeTab(tab){geTab=tab;if(!sbHasDraft('ge'))geEditMode=false;isbTab('ge',renderGeSidebar);}
function renderGeSidebar(){
  const editBtn='<button class="lp-sb-view-edit-btn" onclick="startGeEdit()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>';
  const emp=globalEmpData.find(e=>e.id===geSelectedId);if(!emp)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'bank-details',label:'Bank Details'},{id:'attachments',label:'Attachments'},{id:'salary-details',label:'Salary Details'},{id:'leaves-holidays',label:'Leaves'},{id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'ge-isb-tabs\')" title="Scroll left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>'
    +'<div class="lp-isb-tabs" id="ge-isb-tabs">'+tabs.map(t=>'<button class="lp-isb-tab'+(geTab===t.id?' active':'')+'" onclick="navGeTab(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'ge-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeGeSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const d='<span style="color:#9ca3af">--</span>';
  const v=(x)=>x&&x!=='--'?x:d;
  const iP='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iB='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>';
  const iI='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h4"/></svg>';
  const iPin='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></svg>';
  const iGlobe='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const iBag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>';
  const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iDoc='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  const iPhone='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.2.73.43 1.44.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.9-.87a2 2 0 0 1 2.11-.45c1.37.27 2.08.5 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>';
  const iMail='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  const iTag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const fc=(ico,label,val)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
  let body='';
  if(geTab==='basic-details'&&geEditMode){
    body=sbHero({icon:sbIco.user,name:emp.name,meta:[emp.empId,emp.jobTitle,emp.country],status:empLifeBadge(emp.status),editing:true})
      +(typeof epFormHTML==='function'?epFormHTML('gesb',emp,'admin','cancelGeEdit','saveGeEdit'):buildSbEditForm('gesb',GE_EDIT_FIELDS,emp,'cancelGeEdit','saveGeEdit'));
  }else if(geTab==='basic-details'){
    body=sbHero({icon:sbIco.user,name:emp.name,meta:[emp.empId,emp.jobTitle,emp.country],status:empLifeBadge(emp.status),edit:(typeof epCanAdmin!=='function'||epCanAdmin(emp))?editBtn:''})
      +'<div class="lp-sb-detail-grid">'
      +fc(iP,'Name',v(emp.name))+fc(iB,'Department',v(emp.dept))
      +fc(iI,'Employee ID',v(emp.empId))+fc(iGlobe,'Country',v(emp.country))
      +fc(iBag,'Job Title',v(emp.jobTitle))+fc(iTag,'Worker Type',v(emp.workerType))
      +fc(iCal,'Joining Date',v(emp.joinDate))+fc(iDoc,'Description',v(emp.desc))
      +fc(iPhone,'Contact Number',v(emp.contact))+fc(iMail,'Email',v(emp.email))
      +fc(iP,'Reporting Manager',v(emp.managerEid&&typeof idEmpName==='function'?idEmpName(emp.managerEid):''))
      +'</div>'+(typeof epPanelExtraHTML==='function'?epPanelExtraHTML(emp):'');
  }else if(geTab==='bank-details'){
    const bankData=[
      {loc:'Germany',pay:'Emma Schmidt',bank:'Deutsche Bank'},
      {loc:'Germany',pay:'',bank:''}
    ];
    body=bankTabHTML(bankData);
  }else if(geTab==='attachments'){
    body=attachTabHTML('ge',geSelectedId);
  }else if(geTab==='salary-details'){
    body='<div style="margin-bottom:16px">'
        +'<div style="font-size:15px;font-weight:700;color:var(--navy)">Salary Details</div>'
        +'<div style="font-size:12px;color:var(--orange);margin-top:2px">Configure employee payment details</div>'
      +'</div>'
      +'<div class="ep-form-card" style="margin-bottom:14px">'
        +'<div class="ep-form-title">Core Details</div>'
        +'<div class="ep-form-grid">'
          +'<div class="ep-form-group"><label class="ep-form-label">Base Salary <span class="req">*</span></label><input class="ep-form-input" type="number" placeholder="Enter base salary"></div>'
          +'<div class="ep-form-group"><label class="ep-form-label">Pay Frequency <span class="req">*</span></label>'+apCS('ge-sal-payfreq',['Monthly','Biweekly','Weekly'],'','Select frequency')+'</div>'
          +'<div class="ep-form-group"><label class="ep-form-label">Effective Date</label>'+apCD('ph-eff-date-2','','Select date')+'</div>'
          +'<div class="ep-form-group"><label class="ep-form-label">Currency</label>'+apCS('ge-sal-currency',['EUR (€)','GBP (£)','INR (₹)','USD ($)'],'EUR (€)','EUR (€)')+'</div>'
        +'</div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
        +'<div class="ep-form-card" style="padding:14px"><div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px">Earnings</div><div style="color:var(--orange);font-size:12px;margin-bottom:4px">Base Salary is not set.</div><div style="color:#9ca3af;font-size:12px">No earnings payheads assigned</div></div>'
        +'<div class="ep-form-card" style="padding:14px"><div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px">Deductions</div><div style="color:var(--orange);font-size:12px;margin-bottom:4px">Base Salary is not set.</div><div style="color:#9ca3af;font-size:12px">No deduction payheads assigned</div></div>'
      +'</div>'
      +'<div class="ep-form-card" style="margin-bottom:14px">'
        +'<div class="ep-form-title">Assign Payheads</div>'
        +'<div style="color:#9ca3af;font-size:12px;margin-bottom:10px">No payheads assigned</div>'
        +'<label class="ep-form-label" style="display:block;margin-bottom:6px">Select Additional Payheads</label>'
        +'<div class="ep-emp-search"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search payheads..."></div>'
      +'</div>'
      +'<div class="ep-form-card" style="background:#fffbf5;border-color:#fde68a;padding:16px 22px;margin-bottom:14px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:14px;font-weight:700;color:var(--navy)">Net Salary</span><span style="color:var(--orange);font-weight:700;font-size:20px">--</span></div>'
      +'</div>'
      +'<div class="ep-form-card" style="margin-bottom:16px">'
        +'<div class="ep-form-title">Salary Schedule</div>'
        +salScheduleTableHTML()
      +'</div>'
      +'<div style="display:flex;justify-content:flex-end;gap:10px"><button class="ep-cancel-btn">Cancel</button><button class="ep-save-btn">Save</button></div>';
  }else if(geTab==='leaves-holidays'){
    body=lhPanelHTML('ge',emp.name);
  }else if(geTab==='history'){
    body=sbHistoryHTML(emp);
  }else if(geTab==='logs'){
    /* Same renderer as the Direct Employee panel above — see
       employee-lifecycle.js. */
    body=renderEmpLogsTab('ge',emp);
  }else if(geTab==='workflow'){
    /* While onboarding or offboarding runs, every step of it - done, in
       progress, still to come (empWorkflowSteps); otherwise the record's history. */
    body=wfTimelineHTML(empWorkflowSteps(emp)||geWorkflowData[emp.id]||[]);
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function buildGlobalListingHTML(){
  const d='<span style="color:#9ca3af">--</span>';
  const filtered=geListRows();
  if(geSelectedId&&!filtered.some(e=>e.id===geSelectedId))geSelectedId=null;
  const pgn=listPage('global-employees',geStatusFilter+'|'+geSearchQuery,lpSearchRows(filtered,geSearchQuery).map((e,i)=>'<tr class="ge-row'+(geSelectedId===e.id?' lp-row-selected':'')+'" id="ge-row-'+e.id+'" style="cursor:pointer" onclick="openGeSidebar('+e.id+')">'
    +'<td style="color:var(--gray);font-size:13px">'+(i+1)+'</td>'
    +'<td><div class="lp-c-main">'+e.name+'</div><div class="lp-c-sub">'+(e.empId||'—')+'</div></td>'
    +'<td>'+(e.country||d)+'</td>'
    +'<td>'+(e.jobTitle||d)+'</td>'
    +'<td>'+(e.workerType||d)+'</td>'
    +'<td>'+empLifeBadge(e.status)+'</td>'
    +'<td onclick="event.stopPropagation()">'+empActionCellHTML('ge',e)+'</td>'
    +'</tr>'),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No employees match this filter.</td></tr>');
  const sbInner=geSelectedId?renderGeSidebar():'';
  return '<div class="lp-page">'
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('ge-f-q',geSearchQuery,'Search name, ID','applyGeFilters()')
    +apCS('ge-f-country',['Germany','France','Italy','United Kingdom','Netherlands'],'','Country')
    +apCS('ge-f-type',['EOR','Contractor','PEO'],'','Worker Type')
    +apCS('ge-f-status',EMP_STATUSES,empStatIsGroup(geStatusFilter)?'':geStatusFilter,'Status')
    +clearFiltersBtn([geStatusFilter,geSearchQuery],'resetGeFilters()')
    +'<button class="lp-pill-search" onclick="applyGeFilters()">Search</button>'
    +empExportBtn('ge')
    +'</div></div>'
    +empStatTilesHTML(typeof emsScopeEmployees==='function'?emsScopeEmployees(globalEmpData):globalEmpData,geStatusFilter,'geToggleStatFilter')
    +'</div>'
    +'<div class="lp-split-wrap" style="margin-top:14px"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr>'
    +'<th>SR. NO</th><th>NAME</th><th>COUNTRY</th><th>JOB TITLE</th><th>WORKER TYPE</th><th>STATUS</th><th>ACTION</th>'
    +'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(geSelectedId?' open':'')+'" id="ge-split-sb"><div class="lp-isb" id="ge-isb-inner">'+sbInner+'</div></div>'
    +'</div></div>'
    +buildEmpStatusModalHTML('ge')
    +buildAddEmployeeModalHTML('ge')
    +buildAddTeamModalHTML();
}
function geToggleStatFilter(v){
  geStatusFilter=geStatusFilter===v?'':v;
  geSelectedId=null;renderADTPage();
}
function applyGeFilters(){
  const status=getCSValue('ge-f-status');
  geStatusFilter=status&&status!=='Status'?status:'';
  geSearchQuery=lpSearchValue('ge-f-q');
  geSelectedId=null;
  renderADTPage();
}
function resetGeFilters(){
  geStatusFilter='';geSearchQuery='';
  geSelectedId=null;
  renderADTPage();
}
function openTmSidebar(id){
  if(tmSelectedId!=null&&String(tmSelectedId)!==String(id)&&sbLeaveGuard('tm',function(){openTmSidebar(id);}))return;
  tmTab=sbKeepTab(tmSelectedId,tmTab);tmSelectedId=id;
  const sb=document.getElementById('tm-split-sb');if(sb)sb.classList.add('open');
  isbTab('tm',renderTmSidebar);   // body-only swap when the panel is already open
  document.querySelectorAll('.tm-row').forEach(r=>r.classList.toggle('lp-row-selected',r.id==='tm-row-'+id));
}
function closeTmSidebar(){if(sbLeaveGuard('tm',closeTmSidebar))return;sbEditing=null;
  tmSelectedId=null;
  const sb=document.getElementById('tm-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.tm-row').forEach(r=>r.classList.remove('lp-row-selected'));
}
function navTmTab(tab){if(!sbHasDraft('tm'))sbEditing=null;tmTab=tab;isbTab('tm',renderTmSidebar);}
function renderTmSidebar(){
  const editBtn='<button class="lp-sb-view-edit-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>';
  const team=teamsData.find(t=>t.id===tmSelectedId);if(!team)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'team-members',label:'Team Members'},{id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'tm-isb-tabs\')" title="Scroll left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>'
    +'<div class="lp-isb-tabs" id="tm-isb-tabs">'+tabs.map(t=>'<button class="lp-isb-tab'+(tmTab===t.id?' active':'')+'" onclick="navTmTab(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'tm-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeTmSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const d='<span style="color:#9ca3af">--</span>';
  const v=(x)=>x&&x!=='--'?x:d;
  const iId='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h4"/></svg>';
  const iCheck='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const iTeam='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';
  const iMail='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  const iUser='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const fc=(ico,label,val)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
  const statusVal=sbStatus(team.status);
  let body='';
  if(tmTab==='basic-details'){
    if(sbIsEditing('tm',team.id))body=sbHero({icon:sbIco.users,name:team.name,meta:['Team ID '+team.teamId,team.dept,team.country],status:sbHeroBadge(team.status),editing:true})+sbEditFormHTML('tm',team);
    else body=sbHero({icon:sbIco.users,name:team.name,meta:['Team ID '+team.teamId,team.dept,team.country],status:sbHeroBadge(team.status),edit:sbEditBtnFor('tm',team.id)})
      +'<div class="lp-sb-detail-grid">'
      +fc(iId,'Team ID',v(team.teamId))+fc(iCheck,'Status',statusVal)
      +fc(iTeam,'Team Name',v(team.name))+fc(iMail,'Team Email',v(team.email))
      +fc(iUser,'Created By',v(team.createdBy))+fc(iCal,'Joining Date',v(team.joinDate))
      +'</div>';
  }else if(tmTab==='team-members'){
    const editIco='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    const delIco='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
    const plusIco='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    const nM=team.membersList.length;
    body='<div class="att-bar">'
        +'<span class="att-count">'+nM+' member'+(nM===1?'':'s')+'</span>'
        +'<div class="att-bar-actions"><button class="att-link">'+plusIco+'Add Team Members</button></div>'
      +'</div>'
      +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr>'
      +'<th>Sr. No</th><th>Name</th><th>Role</th><th>Designation</th><th class="csag-act">Action</th>'
      +'</tr></thead>'
      +'<tbody>'+(nM
        ?team.membersList.map((m,i)=>'<tr>'
          +'<td class="csag-td csag-num">'+(i+1)+'</td>'
          +'<td class="csag-td"><div class="lp-c-main">'+m.name+'</div></td>'
          +'<td class="csag-td">'+m.role+'</td>'
          +'<td class="csag-td">'+(m.desig&&m.desig!=='--'?m.desig:'<span style="color:var(--gray)">—</span>')+'</td>'
          +'<td class="csag-td csag-act">'
          +'<button class="att-row-btn" title="Edit">'+editIco+'</button>'
          +'<button class="att-row-btn is-danger" title="Delete">'+delIco+'</button>'
          +'</td>'
          +'</tr>').join('')
        :'<tr><td colspan="5" class="csag-td csag-empty">No members assigned</td></tr>')
      +'</tbody></table></div>';
  }else if(tmTab==='history'){
    body=sbHistoryHTML(team);
  }else if(tmTab==='logs'){
    const logs=tmLogsData[team.id]||[];
    const tmLogKey=(s)=>({Active:'active',Inactive:'inactive'}[s]||'default');
    const csk=tmLogKey(team.status||'Active');
    const formHTML='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+csk+'"></span>'+team.status+'</div>'
      +'<p class="lp-logs-form-sub">Update team status and add a comment</p>'
      +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
      +apCS('tm-log-status-sel',['Active','Inactive'],team.status||'','Select Status')
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="tm-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<button class="lp-logs-save-btn" onclick="tmSaveLog('+team.id+')">Save</button></div>';
    body=lpLogsView(logs,formHTML);
  }else if(tmTab==='workflow'){
    body=wfTimelineHTML(wfApproval(team,tmWorkflowData[team.id]||[],'Admin'));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
/* The tiles are a second way into the status filter, not a filter of their own -
   clicking one sets what the Status dropdown would have set, and clicking it
   again clears it. */
function tmToggleStatFilter(v){
  tmStatusFilter=tmStatusFilter===v?'':v;
  tmSelectedId=null;renderADTPage();
}
function applyTmFilters(){
  const dept=getCSValue('tm-f-dept'),status=getCSValue('tm-f-status');
  tmDeptFilter=dept&&dept!=='Select Department'?dept:'';
  tmStatusFilter=status&&status!=='Status'?status:'';
  tmSearchQuery=lpSearchValue('tm-f-q');
  tmSelectedId=null;renderADTPage();
}
function resetTmFilters(){tmDeptFilter='';tmStatusFilter='';tmSearchQuery='';tmSelectedId=null;renderADTPage();}
function buildTeamsListingHTML(){
  const d='<span style="color:#9ca3af">--</span>';
  /* Counted over the whole set, not the filtered one: a tile that only counts
     what is already on screen reads 0 the moment you filter it away, and the
     number a quick filter offers has to survive being used. */
  const tmCount=function(st){return teamsData.filter(function(t){return t.status===st;}).length;};
  const tmDepts=teamsData.map(function(t){return t.dept;})
    .filter(function(v,i,a){return v&&a.indexOf(v)===i;})
    .sort();
  let tmRows=teamsData;
  if(tmDeptFilter)tmRows=tmRows.filter(t=>t.dept===tmDeptFilter);
  if(tmStatusFilter)tmRows=tmRows.filter(t=>t.status===tmStatusFilter);
  if(tmSelectedId&&!tmRows.some(t=>t.id===tmSelectedId))tmSelectedId=null;
  const pgn=listPage('teams',[tmDeptFilter,tmStatusFilter,tmSearchQuery].join('|'),lpSearchRows(tmRows,tmSearchQuery).map((t,i)=>'<tr class="tm-row'+(tmSelectedId===t.id?' lp-row-selected':'')+'" id="tm-row-'+t.id+'" style="cursor:pointer" onclick="openTmSidebar('+t.id+')">'
    +'<td style="color:var(--gray);font-size:13px">'+(i+1)+'</td>'
    +'<td style="font-weight:600;color:var(--navy)">'+t.name+'</td>'
    +'<td>'+(t.dept||d)+'</td>'
    +'<td>'+(t.country||d)+'</td>'
    +'<td style="font-weight:600;color:var(--navy)">'+t.members+'</td>'
    +'<td><span class="lp-status-badge '+t.status.toLowerCase()+'">'+t.status+'</span></td>'
    +'<td onclick="event.stopPropagation()">'+rowLogCell('teams',t.id)+'</td>'
    +'</tr>'),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No teams match this filter.</td></tr>');
  const sbInner=tmSelectedId?renderTmSidebar():'';
  return '<div class="lp-page">'
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    /* Department, not team name. A list of every team on a page that already
       lists every team filters nothing a reader cannot do by looking - and the
       column this listing actually groups by is Department, which is also what
       the module's own filter set has always named (see getPageMeta). Built off
       the data so a new team's department is offered without a second edit. */
    +lpSearchField('tm-f-q',tmSearchQuery,'Search team','applyTmFilters()')
    +apCS('tm-f-dept',tmDepts,tmDeptFilter,'Select Department')
    +apCS('tm-f-status',['Active','Inactive','Pending'],tmStatusFilter,'Status')
    +clearFiltersBtn([tmDeptFilter,tmStatusFilter,tmSearchQuery],'resetTmFilters()')
    +'<button class="lp-pill-search" onclick="applyTmFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'
    +'<div class="listing-stat'+(tmStatusFilter==='Active'?' stat-selected':'')+'" onclick="tmToggleStatFilter(\'Active\')"><div class="listing-stat-count" style="color:var(--st-ok-fg)">'+tmCount('Active')+'</div><div class="listing-stat-label">Active</div></div>'
    +'<div class="listing-stat'+(tmStatusFilter==='Pending'?' stat-selected':'')+'" onclick="tmToggleStatFilter(\'Pending\')"><div class="listing-stat-count" style="color:var(--st-wait-fg)">'+tmCount('Pending')+'</div><div class="listing-stat-label">Pending</div></div>'
    +'<div class="listing-stat'+(tmStatusFilter==='Inactive'?' stat-selected':'')+'" onclick="tmToggleStatFilter(\'Inactive\')"><div class="listing-stat-count" style="color:var(--st-idle-fg)">'+tmCount('Inactive')+'</div><div class="listing-stat-label">Inactive</div></div>'
    +'</div></div>'
    +'<div class="lp-split-wrap" style="margin-top:14px"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr>'
    +'<th>SR. NO</th><th>TEAM NAME</th><th>DEPARTMENT</th><th>COUNTRY</th><th>MEMBERS</th><th>STATUS</th><th>ACTION</th>'
    +'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(tmSelectedId?' open':'')+'" id="tm-split-sb"><div class="lp-isb" id="tm-isb-inner">'+sbInner+'</div></div>'
    +'</div></div>'
    +buildAddTeamModalHTML();
}
/* The team Logs form had a Save button with nothing behind it. Same commit as
   the leave log below: validate, stamp, move the status, and put a real move
   on the Workflow too. */
function tmSaveLog(id){
  const team=teamsData.find(function(x){return x.id===id;});if(!team)return;
  const sel=csTrigger('tm-log-status-sel');
  const inp=document.getElementById('tm-log-comment-inp');
  const to=getCSValue('tm-log-status-sel'),comment=inp?inp.value.trim():'';
  const flash=function(el){if(el){el.style.borderColor='#b83a3a';setTimeout(function(){el.style.borderColor='';},1500);}};
  if(!to){flash(sel);return;}
  if(!comment){flash(inp);return;}
  const was=team.status;
  const s=stampNow();
  if(!tmLogsData[id])tmLogsData[id]=[];
  tmLogsData[id].unshift({date:s.date,time:s.time,user:CURRENT_USER,status:to,action:comment});
  team.status=to;
  if(to!==was)wfPush(tmWorkflowData,id,'Team '+to,'Moved from '+was+' to '+to+'. '+comment);
  renderADTPage();
  showToast('Log added','success',to!==was?team.name+' moved to '+to+'.':'Comment saved to '+team.name+'.');
}
/* The decision carried in from the dashboard's Approve / Reject, held only
   until the form it pre-fills is submitted or dismissed. It describes one
   click, not a state the leave is in. */
let alPendingStatus='';
/* The moves a leave can make from its Logs tab, and who may make them.
   Statuses are what the record stores; the labels are what the action is
   called in the dropdown and on the submit button. */
/* WHO MAY MOVE A LEAVE (RBAC). h2r.leave.approve decides requests in your
   scope, never your own; h2r.leave.apply withdraws your own while it stands.
   Scope: everyone's with h2r.leave.view.all, your direct reports' and your
   own with h2r.leave.view.team, otherwise your own. A leave names its
   employee by Employee ID (l.eid, js/identity.js). */
function alMine(l){const me=typeof emsActorRecord==='function'?emsActorRecord():null;return !!(me&&l&&l.eid===me.eid);}
function alScope(list){
  if(emsCan('h2r.leave.view.all'))return list;
  const me=emsActorRecord();if(!me)return [];
  const team=emsCan('h2r.leave.view.team')?emsReportsOf(me.eid).map(function(e){return e.eid;}):[];
  return list.filter(function(l){return l.eid&&(l.eid===me.eid||team.indexOf(l.eid)>=0);});
}
function alDecides(l){return emsCan('h2r.leave.approve')&&!alMine(l);}
function alMovesFor(l){
  if(alDecides(l))return AL_MOVES;
  if(alMine(l)&&emsCan('h2r.leave.apply')&&AL_CANCELLABLE.indexOf(l.status)>=0)return ['Cancelled'];
  return [];
}
const AL_MOVES=['Follow Up','Cancelled','Approved','Unapproved'];
const AL_MOVE_LABEL={'Follow Up':'Follow Up','Cancelled':'Cancel','Approved':'Approve','Unapproved':'Unapprove'};
// An employee may withdraw a request only while it still stands.
const AL_CANCELLABLE=['Pending','Follow Up','Approved'];
function alCancelLog(){alPendingStatus='';isbTab('al',renderAlSidebar);}
function alSaveLog(id){
  const l=allLeavesData.find(function(x){return x.id===id;});if(!l)return;
  const sel=csTrigger('al-log-status-sel');
  const inp=document.getElementById('al-log-comment-inp');
  const to=getCSValue('al-log-status-sel'),comment=inp?inp.value.trim():'';
  const flash=function(el){if(el){el.style.borderColor='#b83a3a';setTimeout(function(){el.style.borderColor='';},1500);}};
  if(!to){flash(sel);return;}
  if(!comment){flash(inp);return;}
  /* The same rule the form offers, checked again when it is saved. */
  if(to!==l.status&&alMovesFor(l).indexOf(to)<0){showToast('Not permitted','error','Your role cannot move this leave to '+to+'.');return;}
  const was=l.status;
  const s=stampNow();
  if(!alLogsData[id])alLogsData[id]=[];
  // Signed by the signed-in person, whoever they are.
  alLogsData[id].unshift({date:s.date,time:s.time,user:CURRENT_USER,userId:CURRENT_USER_ID,role:emsRoleLabel(),status:to,action:comment});
  l.status=to;
  // A decision is a stage, so it goes on the Workflow too — a comment that
  // moves nothing is a log entry only.
  if(to!==was)wfPush(alWorkflowData,id,'Leave '+to,'Moved from '+was+' to '+to+'. '+comment);
  alPendingStatus='';
  renderADTPage();
  showToast(to==='Follow Up'?'Follow-up recorded':'Leave '+to.toLowerCase(),'success',l.name+' · '+l.leaveType+' '+l.leaveFrom+'.');
}
/* From the Reporting Manager dashboard. Navigates to the listing, opens THIS
   row's panel on Logs, and pre-selects the decision — the manager still has to
   say why, which the dashboard buttons had no room to ask for.

   The state is set BEFORE navigating: openAlSidebar touches DOM that only
   exists once the leaves page has rendered, so it is queued for after the
   paint rather than called from the dashboard. */
// Clicking the ROW (not a button) just opens the record — no decision implied.
function alOpenFromDashboard(id){alDecideFromDashboard(id,'');}
function alDecideFromDashboard(id,status){
  // A decision lands on Logs ready to be explained; a plain row-click opens
  // the record where you would expect it, on Basic Details.
  const tab=status?'logs':'basic-details';
  alPendingStatus=status||'';
  alSelectedId=id;alTab=tab;
  navigatePage('all-leaves',true);
  setTimeout(function(){openAlSidebar(id,tab,status);},0);
}
function openAlSidebar(id,tab,pendingStatus){
  alTab=tab||sbKeepTab(alSelectedId,alTab);alSelectedId=id;
  alPendingStatus=pendingStatus||'';
  const sb=document.getElementById('al-split-sb');if(sb)sb.classList.add('open');
  isbTab('al',renderAlSidebar);   // body-only swap when the panel is already open
  document.querySelectorAll('.al-row').forEach(r=>r.classList.toggle('lp-row-selected',r.id==='al-row-'+id));
}
function closeAlSidebar(){
  alSelectedId=null;
  const sb=document.getElementById('al-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.al-row').forEach(r=>r.classList.remove('lp-row-selected'));
}
function navAlTab(tab){alTab=tab;isbTab('al',renderAlSidebar);}
// Payroll cycle detail sidebar. Opened by the row action button on the payroll
// listing. Tabs mirror the other listing sidebars so the pattern is consistent.
function renderPrSidebar(){
  const r=payrollRecords[prSelectedId];if(!r)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'pay-summary',label:'Pay Summary'},{id:'workflow',label:'Workflow'}];
  const chevL='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>';
  const chevR='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
  const xIco='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'pr-isb-tabs\')" title="Scroll left">'+chevL+'</button>'
    +'<div class="lp-isb-tabs" id="pr-isb-tabs">'+tabs.map(t=>'<button class="lp-isb-tab'+(prTab===t.id?' active':'')+'" onclick="navPrTab(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'pr-isb-tabs\')" title="Scroll right">'+chevR+'</button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closePrSidebar()" title="Close">'+xIco+'</button></div>'
    +'</div>';
  const iCal='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iGlobe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const iUser='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iUsers='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>';
  const iCash='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><circle cx="12" cy="14" r="3"/></svg>';
  const iBank='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>';
  const iHash='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>';
  const iClock='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  const iCheck='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>';
  const fc=(icon,label,value)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+icon+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+(value||'-')+'</div></div></div>';
  let body='';
  if(prTab==='basic-details'){
    // Status is a field card in the grid, not loose text in the header. Every
    // other detail panel in the app states it that way - see the Status cards
    // on Employees, Compliance, Rates & Rules, Contract Templates, Tickets and
    // Chats - and the generic listing panel turns a Status column into the same
    // card. Hung off the section title instead, it read as a heading colour
    // rather than a value the record carries.
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Cycle Details</span></div>'
      +'<div class="lp-sb-detail-grid" style="margin-bottom:20px">'
      +fc(iHash,'Payroll ID',r.payrollId)+fc(iCheck,'Status',sbStatus(r.status))
      +fc(iCal,'Cycle',r.cycle)
      +fc(iCal,'Pay Period',r.period)+fc(iCal,'Frequency',r.frequency)
      +fc(iGlobe,'Country',r.country)+fc(iBank,'Entity',r.entity)
      +fc(iCash,'Currency',r.currency)+fc(iUsers,'Employees',String(r.employees))
      +'</div>'
      +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Schedule &amp; Ownership</span></div>'
      +'<div class="lp-sb-detail-grid">'
      +fc(iClock,'Input Cut-off',r.cutOff)+fc(iCal,'Pay Date',r.payDate)
      +fc(iBank,'Payment Method',r.payMethod)+fc(iUser,'Payroll Owner',r.owner)
      +'</div>';
  }else if(prTab==='pay-summary'){
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Pay Summary</span></div>'
      +'<div class="lp-sb-detail-grid" style="margin-bottom:20px">'
      +fc(iCash,'Gross Pay',r.grossPay)+fc(iCash,'Total Deductions',r.deductions)
      +fc(iCash,'Employer Contributions',r.employerCost)+fc(iCash,'Net Payable',r.netPayable)
      +fc(iCash,'Total Employer Cost',r.totalCost)+fc(iUsers,'Employees Paid',String(r.employees))
      +'</div>'
      +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Approval</span></div>'
      +'<div class="lp-sb-detail-grid">'
      +fc(iCheck,'Approved By',r.approver)+fc(iCal,'Approved On',r.approvedOn)
      +'</div>';
  }else if(prTab==='history'){
    body=sbHistoryHTML(r);
  }else if(prTab==='logs'){
    // seedLogs copies the fixture onto the record once, then reads only
    // r.logs - otherwise the fixture wins on every repaint and an entry the
    // user just submitted disappears the moment they switch tabs.
    const logs=seedLogs(r,prLogsData[r.id]);
    const prLogKey=(st)=>({Active:'active',Inactive:'inactive',Pending:'default'}[st]||'default');
    // The log action the tab was missing. Same markup Rates & Rules, Compliance
    // and Contract Templates use, so a Pay Runs log reads and behaves exactly
    // like a log anywhere else.
    const csk=prLogKey(r.status);
    const formHTML='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+csk+'"></span>'+r.status+'</div>'
      +'<p class="lp-logs-form-sub">Update cycle status and add a comment</p>'
      +lpLogStatusField('pr-log-status-sel',r.status,['Active','Pending','Inactive'])
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="pr-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="ep-cancel-btn" style="flex:1" onclick="prCancelLog()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="prSaveLog('+r.id+')">Submit</button>'
      +'</div>'
      +'</div>';
    body=lpLogsView(logs,formHTML);
  }else if(prTab==='workflow'){
    body=wfTimelineHTML(wfPayroll(r));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
// Standard workflow timeline. Same markup the existing workflow tabs emit -
// used by the sidebars that previously had no workflow, so every Workflow tab
// in the app renders identically.
/* THE WORKFLOW TAB - every step of the process, in order.
   An entry with no state is a step already done: who did it, when, and the
   remarks. Done steps read oldest first (sorted by their own date and time,
   whatever order a module keeps them in). After them, where a module knows
   its process, come the step in progress ({state:'current', owner} - "In
   progress", "Pending with <owner>") and the steps still to come
   ({state:'todo', owner} - "Not started yet"). */
function wfStepTime(w,i){
  const t=Date.parse(String(w.date||'').replace(/(\d+) (\w+) (\d{4})/,'$2 $1, $3')+' '+String(w.time||'').replace(/^(\d+:\d+)(:\d+)? ?([AP]M)$/i,'$1 $3'));
  return isNaN(t)?null:t;
}
function wfTimelineHTML(wf){
  const pSvg='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const cSvg='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  if(!wf||!wf.length)return '<div class="lp-wf-empty">No workflow activity yet.</div>';
  const done=wf.filter(function(w){return !w.state;}).map(function(w,i){return {w:w,i:i,t:wfStepTime(w,i)};});
  const dated=done.every(function(x){return x.t!==null;});
  done.sort(function(x,y){return dated?(x.t-y.t)||(y.i-x.i):(y.i-x.i);});   // undated: stored newest first
  const steps=done.map(function(x){return x.w;}).concat(wf.filter(function(w){return w.state;}));
  return '<div class="lp-wf-wrap">'+steps.map(function(w,i){
    const st=w.state||'done';
    const meta=st==='done'
      ?'<span class="lp-wf-meta-item">'+pSvg+'<span>'+w.user+'</span></span>'
        +(w.date?'<span class="lp-wf-meta-item">'+cSvg+'<span>'+w.date+'</span></span>':'')
        +(w.time?'<span class="lp-wf-meta-sep">|</span><span class="lp-wf-meta-item"><span>'+w.time+'</span></span>':'')
      :st==='current'
        ?'<span class="lp-wf-meta-item">'+pSvg+'<span>Pending with '+w.owner+'</span></span>'
        :'<span class="lp-wf-meta-item">'+pSvg+'<span>'+w.owner+'</span></span><span class="lp-wf-not-started">Not started yet</span>';
    const remarks=st==='todo'?'':(w.description||(st==='current'?'Awaiting <b>'+w.owner+'</b>.':''));
    return '<div class="lp-wf-row is-'+st+'">'
      +'<div class="lp-wf-dot-col"><div class="lp-wf-dot"></div>'+(i<steps.length-1?'<div class="lp-wf-connector"></div>':'')+'</div>'
      +'<div class="lp-wf-card"><div class="lp-wf-title">'+w.title+(st==='current'?'<span class="lp-wf-chip">In progress</span>':'')+'</div>'
      +'<div class="lp-wf-meta-row">'+meta+'</div>'
      +(remarks?'<div class="lp-wf-desc"><span class="lp-wf-desc-label">Remarks:</span><span class="lp-wf-desc-text">'+remarks+'</span></div>':'')
      // Optional per-stage footer (the compliance document viewer).
      +(w.extra||'')
      +'</div></div>';
  }).join('')+'</div>';
}

function renderAlSidebar(){
  const l=allLeavesData.find(x=>x.id===alSelectedId);if(!l)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'al-isb-tabs\')" title="Scroll left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>'
    +'<div class="lp-isb-tabs" id="al-isb-tabs">'+tabs.map(t=>'<button class="lp-isb-tab'+(alTab===t.id?' active':'')+'" onclick="navAlTab(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'al-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeAlSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const iUser='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iTag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iDoc='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
  const iMail='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  const iClock='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  const iCheck='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const iId='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg>';
  const fc=(ico,label,val)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
  let body='';
  if(alTab==='basic-details'){
    const stVal=sbStatus(l.status);
    const subVal=sbStatus(l.subStatus);
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">'+l.name+'</span></div>'
      +'<div class="lp-sb-detail-grid">'
      +fc(iId,'Employee ID',l.empId)+fc(iCheck,'Status',stVal)
      +fc(iUser,'Name',l.name)+fc(iCheck,'Sub Status',subVal)
      +fc(iTag,'Leave ID',l.leaveId)+fc(iTag,'Leave Type',l.leaveType)
      +fc(iCal,'Leave From','<span style="color:var(--orange)">'+l.leaveFrom+'</span>')+fc(iCal,'Leave To','<span style="color:var(--orange)">'+l.leaveTo+'</span>')
      +fc(iDoc,'Description',l.description)+fc(iMail,'Email Address','<span style="color:var(--orange)">'+l.email+'</span>')
      +fc(iClock,'Applied on Date',l.appliedDate)+fc(iUser,'Created by',l.createdBy)
      +'</div>';
  }else if(alTab==='history'){
    body=sbHistoryHTML(l);
  }else if(alTab==='logs'){
    const logs=alLogsData[l.id]||[];
    /* Arriving from the dashboard's Approve / Reject the decision is already
       made, so the form opens on it and asks only for the reason. The buttons
       there cannot collect one, which is why they hand off here rather than
       committing on the spot — a leave decision with no note is one nobody can
       explain to the employee later. */
    const preset=alPendingStatus||l.status;
    /* A preset arrives when the form was opened from a row's Approve/Reject;
       opened from the tab it starts empty, where the native control used to
       default to whatever was first in the list. */
    /* WHO MAY MOVE A LEAVE, AND WHERE TO. HR and admins decide it: four
       moves, offered as one "Select action" dropdown. The employee can only
       withdraw their own request, and only while it still stands. Everyone
       else reads the log. */
    const admin=alDecides(l);
    const statusOps=alMovesFor(l);
    if(!statusOps.length){
      // A closed leave gets the log's own closed card; an open one says who acts.
      const closed=l.status==='Cancelled'||l.status==='Unapproved';
      body=lpLogsView(logs,'',{current:l.status,statusLabel:'Leave Status',
        noAction:closed?null:alMine(l)
          ?{title:'Nothing to change',sub:'A leave can be cancelled while it is pending, in follow-up or approved.'}
          :{title:'Pending with HR',sub:'Leave requests are approved, followed up or cancelled by HR or an admin.'}});
      return tabBar+'<div class="lp-isb-body">'+body+'</div>';
    }
    const decided=alPendingStatus&&alPendingStatus!==l.status;
    const actionPanel='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+String(preset||'').toLowerCase()+'"></span>'+(decided?preset:'Update Status')+'</div>'
      +'<p class="lp-logs-form-sub">'+(decided
        ? 'Say why &mdash; '+l.name+' will see this on their request.'
        : 'Change the leave status and add a note.')+'</p>'
      +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
      +apCS('al-log-status-sel',statusOps,preset||'','Select Status')
      +'<div class="lp-logs-form-label">'+(decided?'Reason':'Comment')+' <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="al-log-comment-inp" placeholder="'+(decided?'e.g. Approved — cover arranged with the team':'Add a note...')+'"></textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="ep-cancel-btn" style="flex:1" onclick="alCancelLog()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="alSaveLog('+l.id+')">Update</button>'
      +'</div>'
      +'</div>';
    body=lpLogsView(logs,actionPanel,{current:l.status,open:decided?preset:'',statusLabel:'Leave Status',
      labels:admin?AL_MOVE_LABEL:{Cancelled:'Cancel Leave'},select:admin,
      aiUser:CURRENT_USER,
      aiContext:function(v){return alAiContext(l,v);},
      // alSaveLog writes the status, and a real move adds a Workflow stage.
      aiFields:function(v){
        return [{label:'Leave Status',from:l.status,to:v},
          {label:'Leave Period',info:true,to:l.leaveFrom+(l.leaveTo&&l.leaveTo!==l.leaveFrom?' – '+l.leaveTo:'')+' · '+l.leaveHours}]
          .concat(v!==l.status?[{label:'Workflow Stage',to:'Leave '+v}]:[]);
      }});
  }else if(alTab==='workflow'){
    body=wfTimelineHTML(wfLeave(l));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
/* "AI fetched results" context for a leave decision. Approving or refusing
   turns on two things the row alone does not show: whether the dates clash
   with another leave this employee already has, and how much notice was
   given. Cancelling an approved leave turns on whether it has started. A
   Follow Up needs the employee's own reason and nothing else. */
function alDay(s){const m=String(s||'').match(/^(\d{2})-(\d{2})-(\d{4})/);return m?new Date(+m[3],m[2]-1,+m[1]):null;}
function alAiContext(l,v){
  if(v===l.status)return null;
  const from=alDay(l.leaveFrom),to=alDay(l.leaveTo)||from;
  const reason={label:'Employee’s Reason',value:l.description,wide:true};
  const type={label:'Leave Type',value:l.leaveType+(l.subStatus?' · '+l.subStatus:'')};
  if(v==='Follow Up')return {title:'What the employee said',rows:[type,reason]};
  if(v==='Approved'||v==='Unapproved'){
    const clash=from?allLeavesData.filter(function(x){
      if(x.id===l.id||x.empId!==l.empId||['Approved','Pending','Follow Up'].indexOf(x.status)<0)return false;
      const a=alDay(x.leaveFrom),b=alDay(x.leaveTo)||a;
      return a&&a<=to&&b>=from;
    }):[];
    const applied=new Date(String(l.appliedDate||'').replace(',','').replace(/(\d{2}:\d{2}:\d{2})$/,' $1'));
    const days=from&&!isNaN(applied)?Math.floor((from-applied)/864e5):null;
    return {title:v==='Approved'?'Before approving':'Before refusing',rows:[type,
      {label:'Overlapping Leave',value:clash.length?clash.length+' request'+(clash.length===1?'':'s'):'None',
       state:clash.length?'warn':'ok',
       note:clash.map(function(x){return x.leaveType+' '+x.leaveFrom+' ('+x.status+')';}).join(', ')},
      // Short notice is only worth flagging on planned leave - sick leave is
      // applied for on the day by its nature.
      {label:'Notice Given',value:days==null?'':days<0?'Applied after it began':days===0?'Same day':days+' day'+(days===1?'':'s'),
       state:days!=null&&days<1&&!/sick/i.test(l.leaveType)?'warn':'',
       note:days!=null&&days<1&&!/sick/i.test(l.leaveType)?'Planned leave with no notice':''},
      reason]};
  }
  if(v==='Cancelled'&&l.status==='Approved'){
    const started=from&&from<=new Date();
    return {title:'Cancelling an approved leave',rows:[type,
      {label:'Leave Period',value:l.leaveFrom+(l.leaveTo&&l.leaveTo!==l.leaveFrom?' – '+l.leaveTo:''),
       state:started?'warn':'ok',note:started?'Already started - days taken stay taken':'Not started yet'}]};
  }
  return null;
}
var alDurationType='multiple';
var alAddModalOpen=false;   // creation is a popup, like every other create form
function setAlDurationType(type){
  alDurationType=type;
  const form=document.getElementById('al-add-form');
  if(!form)return;
  const dateRow=document.getElementById('al-add-date-row');
  const fromGroup=document.getElementById('al-add-from-group');
  const toGroup=document.getElementById('al-add-to-group');
  const halfNote=document.getElementById('al-half-note');
  /* Two classes on the chosen button and nothing else, the same pair
     peoSelectRadio() sets: .active is what the strip CSS paints, .selected is
     the marker the form's own readers look for. */
  form.querySelectorAll('.al-dur-radio').forEach(function(r){r.classList.remove('selected','active');});
  const sel=form.querySelector('.al-dur-radio[data-type="'+type+'"]');
  if(sel)sel.classList.add('selected','active');
  if(type==='half'){
    if(dateRow)dateRow.style.display='grid';
    if(fromGroup)fromGroup.style.display='';
    if(toGroup)toGroup.style.display='none';
    if(halfNote)halfNote.style.display='';
  }else if(type==='one'){
    if(dateRow)dateRow.style.display='grid';
    if(fromGroup)fromGroup.style.display='';
    if(toGroup)toGroup.style.display='none';
    if(halfNote)halfNote.style.display='none';
  }else{
    if(dateRow)dateRow.style.display='grid';
    if(fromGroup)fromGroup.style.display='';
    if(toGroup)toGroup.style.display='';
    if(halfNote)halfNote.style.display='none';
  }
}
function toggleAlCc(){
  const wrap=document.getElementById('al-cc-wrap');
  if(wrap)wrap.style.display=wrap.style.display==='none'?'':'none';
}
// The size limit is checked when the file is picked, not on submit, so the
// person learns about it while they can still choose another file.
function alAttachChosen(input){
  const f=input.files&&input.files[0];
  if(f&&f.size>5*1024*1024){
    input.value='';
    showToast('File too large','error','"'+sbEsc(f.name)+'" is over the 5 MB limit.');
  }
  updateFileLabel(input,'al-attach-name');
}
function submitAddLeave(isDraft){
  const emp=alSelectedEmp();const empVal=emp?emp.name:'';
  const typeWrap=document.getElementById('csw-al-type');
  const typeVal=typeWrap?typeWrap.querySelector('.cs-value').textContent.trim():'';
  const fromVal=(document.getElementById('al-from-date')||{}).value||'';
  const emailVal=(document.getElementById('al-email-input')||{}).value||'';
  const descVal=(document.getElementById('al-desc')||{}).value||'';
  const attachEl=document.getElementById('al-attach');
  const attachFile=attachEl&&attachEl.files&&attachEl.files[0];
  if(!isDraft){
    if(!empVal){showToast('Please select an employee','error');return;}
    if(!typeVal||typeVal==='Select'){showToast('Please select a leave type','error');return;}
    if(!fromVal){showToast('Please select a From Date','error');return;}
    if(!emailVal){showToast('Please enter employee email','error');return;}
    if(!descVal){showToast('Please enter a description','error');return;}
  }
  const toVal=alDurationType==='multiple'?((document.getElementById('al-to-date')||{}).value||fromVal):fromVal;
  const newId=allLeavesData.length?Math.max.apply(null,allLeavesData.map(function(x){return x.id;}))+1:1;
  const leaveIdNum=allLeavesData.length?Math.max.apply(null,allLeavesData.map(function(x){return parseInt(x.leaveId)||0;}))+1:2100;
  const fmtDate=function(d){
    if(!d)return '--';
    var p=d.split('-');
    return p.length===3?p[2]+'-'+p[1]+'-'+p[0]:d;
  };
  const hrMap={'half':'Half Day','one':'Full Day','multiple':'Full Day'};
  lpLanded('all-leaves',newId);
  allLeavesData.unshift({
    id:newId,empId:emp&&emp.empId!=='—'?emp.empId:'CLOCLO'+Math.floor(10000+Math.random()*90000),name:empVal||'Unknown',
    leaveId:String(leaveIdNum),leaveType:typeVal||'Casual Leave',
    leaveFrom:fmtDate(fromVal),leaveTo:fmtDate(toVal),
    leaveHours:hrMap[alDurationType]||'Full Day',
    description:descVal,email:emailVal,
    attachments:attachFile?[{name:attachFile.name,size:attachFmtSize(attachFile.size),type:attachKind(attachFile.name),
      by:CURRENT_USER,source:'Leave request',date:new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}]:[],
    appliedDate:new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})+' '+new Date().toLocaleTimeString(),
    createdBy:CURRENT_USER,createdById:CURRENT_USER_ID,status:isDraft?'Pending':'Pending',subStatus:'Unpaid',
    /* Linked to the employee record when exactly one in this entity has the name (js/identity.js). */
    entityId:idEntity(),eid:(function(){const e=typeof idEmpByName==='function'?idEmpByName(empVal,idEntity()):null;return e?e.eid:'';})()
  });
  alDurationType='multiple';alAddModalOpen=false;
  renderADTPage();
  showToast(isDraft?'Leave saved as draft':'Leave request created','success',(empVal||'Employee')+' &middot; '+(typeVal&&typeVal!=='Select'?typeVal:'Casual Leave'));
}
/* CREATION IS A POPUP, like every other create form in the app. This was the
   second-to-last page that navigated away to file one record, which meant the
   queue you were adding to vanished the moment you started adding to it.

   NOTHING ABOUT THE FORM ITSELF CHANGED. The same field ids, the same duration
   radios and the same submit read them, so setAlDurationType's live show/hide
   of the To Date and the Session picker works exactly as it did — only the
   shell around them is different. */
function startAddLeave(){
  alDurationType='multiple';alAddModalOpen=true;renderADTPage();
}
function cancelAddLeave(){alAddModalOpen=false;renderADTPage();}
function buildAddLeaveModalHTML(){
  const leaveTypes=['Casual Leave','Sick Leave','Paid Leave'];
  /* THE SAME STRIP THE REST OF THE APP USES. These three were bare dots drawn
     with inline styles, which made them a third control on a screen that
     already had one. peoRadioSeg() draws them now, so they cannot drift. */
  const radioItem=function(type,label,checked){
    return peoRadioSeg('al-dur-radio',label,checked,
      "setAlDurationType('"+type+"')",'data-type="'+type+'"');
  };
  const xSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const uploadIco='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form" onclick="event.stopPropagation()" id="al-add-form">'
    /* Title on the left, the leave balance tiles on the right - where a
       listing page sets its status tiles. See lhTypeBal(). */
    +'<div class="fp-head"><div class="fp-head-main">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create New Leave</span>'
      +'<button class="ct-modal-close" onclick="cancelAddLeave()">'+xSvg+'</button></div>'
    +'<p class="ct-modal-sub">Who the leave is for, how long it runs, and why.</p></div>'
    +(function(){const b=lhTypeBal(!emsCan('h2r.leave.view.all')?lbMe():null,'','','');
      return '<div class="'+b.cls+'" id="al-type-bal">'+b.html+'</div>';})()
    +'</div>'
    +'<div class="ep-form-card" style="padding:0;overflow:visible;margin-bottom:18px">'

    // Row 1: Employee + Leave Type
    +'<div class="policy-form-section">'
    +'<div class="policy-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Select Employee <span class="req">*</span></label>'
    /* A pick from the roster, not free text: a typed name that matches nobody
       could not show a balance or file a request against a real person. The
       menu searches by name or ID (data-cssearch). */
    +apCS('al-emp',alEmpOptions(),'','Search by name or ID','alPickEmp').replace('<div class="cs-wrap"','<div class="cs-wrap" data-cssearch="1"')
    +'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Leave Type <span class="req">*</span></label>'
    +apCS('al-type',leaveTypes,'','Select','alRefreshBal')+'</div>'
    +'</div>'
    +'</div>'

    // Row 2: Duration type radio
    +'<div class="policy-form-section" style="border-top:1px dashed #e5e7eb">'
    +'<div class="ep-form-label peo-elig-lbl">Duration <span class="req">*</span></div>'
    +'<div class="segmented">'
    +radioItem('half','Half day',false)
    +radioItem('one','One day',false)
    +radioItem('multiple','Multiple Day',true)
    +'</div>'
    +'<div id="al-half-note" style="display:none;margin-top:10px">'
    +'<label class="ep-form-label" style="margin-bottom:6px">Session</label>'
    +apCS('al-session',['First Half','Second Half'],'','Select Session')
    +'</div>'
    +'</div>'

    // Row 3: From / To dates
    +'<div class="policy-form-section" id="al-add-date-row" style="border-top:1px dashed #e5e7eb">'
    +'<div class="policy-form-grid">'
    +'<div class="ep-form-group" id="al-add-from-group"><label class="ep-form-label">From Date <span class="req">*</span></label>'
    +apCD('al-from-date','','Select date','alRefreshBal')+'</div>'
    +'<div class="ep-form-group" id="al-add-to-group"><label class="ep-form-label">To Date <span class="req">*</span></label>'
    +apCD('al-to-date','','Select date')+'</div>'
    +'</div></div>'

    // Row 4: Email section
    +'<div class="policy-form-section" style="border-top:1px dashed #e5e7eb">'
    +'<div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:12px">Send email to employee</div>'
    +'<div class="ep-form-group" style="margin-bottom:10px">'
    +'<label class="ep-form-label">Employee email ID <span class="req">*</span></label>'
    +'<div style="display:flex;align-items:center;gap:10px">'
    +'<div class="ep-emp-search" style="flex:1;margin-bottom:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    +'<input id="al-email-input" type="email" placeholder="Type email to search"></div>'
    +'<button onclick="toggleAlCc()" style="color:var(--orange);background:none;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0">+ Add cc</button>'
    +'</div></div>'
    +'<div id="al-cc-wrap" style="display:none">'
    +'<div class="ep-form-group"><label class="ep-form-label">CC</label>'
    +'<div class="ep-emp-search"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    +'<input id="al-cc-input" type="email" placeholder="Add CC email"></div></div>'
    +'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Description <span class="req">*</span></label>'
    +'<textarea id="al-desc" class="ep-form-input" rows="4" placeholder="Leave reason" style="resize:vertical;min-height:90px;height:auto;line-height:1.5"></textarea>'
    +'</div>'
    // Optional: a medical certificate, a travel ticket - evidence, never a gate.
    +'<div class="ep-form-group" style="margin-top:12px"><label class="ep-form-label">Attachment <span style="font-weight:400;color:var(--gray)">(optional)</span></label>'
    +'<label class="ep-file-input" for="al-attach"><span class="ep-file-btn">'+uploadIco+'Choose File</span><span class="ep-file-name" id="al-attach-name">No file chosen</span></label>'
    +'<input type="file" id="al-attach" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" style="display:none" onchange="alAttachChosen(this)">'
    +'<span style="font-size:11px;color:var(--gray);margin-top:2px">PDF, image or Word document, up to 5 MB.</span></div>'
    +'</div>'

    +'</div>'
    +'<div class="ct-modal-foot">'
      +'<button class="ep-cancel-btn" onclick="submitAddLeave(true)">Save as Draft</button>'
      +'<div class="ct-modal-btns">'
        +'<button class="ep-cancel-btn" onclick="cancelAddLeave()">Cancel</button>'
        +'<button class="ep-save-btn" onclick="submitAddLeave(false)">Create Request</button>'
      +'</div>'
    +'</div>'
    +'</div></div>';
}
/* ── LEAVE BALANCE TILE (Leave Requests) ─────────────────────────────────
   The signed-in person's own leave left, as one figure, between the filters
   and the status tiles - drawn as a status tile so it reads as one of the
   page's figures, but in its own box and with no hover or press, because it
   filters nothing.

   Everyone who works here has a balance, so every role sees their own - except
   HR and admins, whose view of this page is the whole team's requests; they
   read balances on the Employees panel → Leaves.

   The figure is the Leave Balance module's (lbRows in js/leave-balance.js),
   summed across the person's leave types: what is left after approved and
   pending days, carried-forward days included. */
function alBalanceOf(name){
  return lbRows(name).map(function(r){
    return {type:r.type,entitled:r.yearly+r.cfOpen,taken:r.yAvailed+r.cfUsed,pending:r.yPending,available:r.yAvailable+r.cfBalance};
  });
}
function alBalCardHTML(){
  if(emsCan('h2r.leave.view.all')||!lbMe())return '';
  const rows=alBalanceOf(lbMe());
  const fmt=function(n){return String(+n.toFixed(1));};
  const tot=rows.reduce(function(s,r){s.entitled+=r.entitled;s.available+=r.available;return s;},{entitled:0,available:0});
  // The split by leave type is on hover, and in full under My Profile → Leaves.
  const tip=rows.length
    ?rows.map(function(r){return r.type+': '+fmt(r.available)+' of '+r.entitled+' left';}).join('\n')
    :'No active leave policy is assigned to you yet.';
  const tone=!rows.length?'var(--gray)':tot.available<=0?'var(--st-bad-fg)':'var(--st-ok-fg)';
  return '<div class="listing-stats al-bal-stat" id="al-bal" title="'+sbEsc(tip)+'">'
    +'<div class="listing-stat"><div class="listing-stat-count" style="color:'+tone+'">'+(rows.length?fmt(tot.available):'—')+'</div>'
      +'<div class="listing-stat-label">Leave Balance</div></div>'
  +'</div>';
}
function buildAllLeavesHTML(){
  const hamburger='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const stClass={Approved:'approved',Pending:'pending','Follow Up':'follow-up',Unapproved:'inactive',Rejected:'inactive',Cancelled:'cancelled'};
  const scoped=alScope(allLeavesData);
  const filtered=alStatusFilter?scoped.filter(l=>l.status===alStatusFilter):scoped;
  if(alSelectedId&&!filtered.some(l=>l.id===alSelectedId))alSelectedId=null;
  const pgn=listPage('all-leaves',alStatusFilter+'|'+alSearchQuery,lpSearchRows(filtered,alSearchQuery).map((l,i)=>'<tr class="al-row'+(alSelectedId===l.id?' lp-row-selected':'')+'" id="al-row-'+l.id+'" style="cursor:pointer" onclick="openAlSidebar('+l.id+')">'
    +'<td style="color:#6b7280;font-size:13px">'+(i+1)+'</td>'
    +'<td style="font-weight:600;color:var(--navy)">'+l.leaveId+'</td>'
    +'<td style="font-weight:600;color:var(--navy)">'+l.name+'</td>'
    +'<td>'+l.leaveHours+'</td>'
    +'<td>'+l.leaveFrom+'</td>'
    +'<td>'+l.leaveTo+'</td>'
    +'<td><span class="lp-status-badge '+(stClass[l.status]||'pending')+'">'+l.status+'</span></td>'    +'<td onclick="event.stopPropagation()">'+rowLogCell('all-leaves',l.id)+'</td>'
    +'</tr>'),'<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--gray)">No leave requests match this filter.</td></tr>');
  const approvedCount=scoped.filter(l=>l.status==='Approved').length;
  const unapprovedCount=scoped.filter(l=>l.status==='Unapproved').length;
  const pendingCount=scoped.filter(l=>l.status==='Pending').length;
  const sbInner=alSelectedId?renderAlSidebar():'';
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('al-f-q',alSearchQuery,'Search name, ID','applyAlFilters()')
    +apCS('al-f-type',['Casual Leave','Sick Leave','Earned Leave','Maternity Leave','Paternity Leave'],'','Leave Type')
    +apCS('al-f-status',['Approved','Pending','Follow Up','Unapproved','Cancelled'],alStatusFilter,'Status')
    +clearFiltersBtn([alStatusFilter,alSearchQuery],'resetAlFilters()')+'<button class="lp-pill-search" onclick="applyAlFilters()">Search</button>'
    +'</div></div>'
    +alBalCardHTML()
    +'<div class="listing-stats" style="flex-shrink:0">'
    +'<div class="listing-stat approved'+(alStatusFilter==='Approved'?' stat-selected':'')+'" onclick="alToggleStatFilter(\'Approved\')"><div class="listing-stat-count">'+approvedCount+'</div><div class="listing-stat-label">Approved</div></div>'
    +'<div class="listing-stat inactive'+(alStatusFilter==='Unapproved'?' stat-selected':'')+'" onclick="alToggleStatFilter(\'Unapproved\')"><div class="listing-stat-count">'+unapprovedCount+'</div><div class="listing-stat-label">Unapproved</div></div>'
    +'<div class="listing-stat pending'+(alStatusFilter==='Pending'?' stat-selected':'')+'" onclick="alToggleStatFilter(\'Pending\')"><div class="listing-stat-count">'+pendingCount+'</div><div class="listing-stat-label">Pending</div></div>'
    +'</div></div>'
    +'<div class="lp-split-wrap" style="margin-top:14px"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr>'
    +'<th>S.No</th><th>Key ID</th><th>Full Name</th><th>Leave Hours</th><th>From Date</th><th>To Date</th><th>Status</th><th>Action</th>'
    +'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(alSelectedId?' open':'')+'" id="al-split-sb"><div class="lp-isb" id="al-isb-inner">'+sbInner+'</div></div>'
    +'</div></div>'
    +(alAddModalOpen?buildAddLeaveModalHTML():'');
}
function togglePmAction(id,e){
  if(e)e.stopPropagation();
  document.querySelectorAll('.ct-action-menu').forEach(m=>{if(m.id!=='pm-ctm-'+id)m.classList.remove('open');});
  const m=document.getElementById('pm-ctm-'+id);if(!m)return;
  const willOpen=!m.classList.contains('open');
  m.classList.toggle('open');
  if(willOpen&&e){
    const wrap=e.target.closest('.ct-action-wrap');
    if(wrap)placeActionMenu(m,wrap);
  }
}
function alToggleStatFilter(v){
  alStatusFilter=alStatusFilter===v?'':v;
  alSelectedId=null;
  renderADTPage();
}
function applyAlFilters(){
  const status=getCSValue('al-f-status');
  alStatusFilter=status&&status!=='Status'?status:'';
  alSearchQuery=lpSearchValue('al-f-q');
  alSelectedId=null;
  renderADTPage();
}
function resetAlFilters(){
  alStatusFilter='';alSearchQuery='';
  alSelectedId=null;
  renderADTPage();
}
/* `tab` and `pendingStatus` are what the row's Invoice Status menu passes in -
   a plain row click still lands on Basic Details with nothing pending. */
function openPmSidebar(id,tab,pendingStatus){
  if(pmSelectedId!=null&&String(pmSelectedId)!==String(id)&&sbLeaveGuard('pm',function(){openPmSidebar(id,tab,pendingStatus);}))return;
  pmTab=tab||sbKeepTab(pmSelectedId,pmTab);pmSelectedId=id;pmUserSubTab='company-details';
  pmPendingStatus=pendingStatus||'';
  const sb=document.getElementById('pm-split-sb');if(sb)sb.classList.add('open');
  isbTab('pm',renderPmSidebar);   // body-only swap when the panel is already open
  document.querySelectorAll('.pm-row').forEach(r=>r.classList.toggle('lp-row-selected',r.id==='pm-row-'+id));
}
/* Picking a step from the row menu used to close the menu and do nothing else -
   the four entries were a dead control. It now does what the same menu on
   Contracts does (ctPickStatus): open the record's panel on Logs with that step
   already selected, so the move is recorded with a reason instead of silently. */
function pmPickStatus(id,status){
  closePmMenus();
  openPmSidebar(id,'logs',status);
}
function closePmSidebar(){if(sbLeaveGuard('pm',closePmSidebar))return;sbEditing=null;
  pmSelectedId=null;pmPendingStatus='';
  const sb=document.getElementById('pm-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.pm-row').forEach(r=>r.classList.remove('lp-row-selected'));
}
function navPmTab(tab){if(!sbHasDraft('pm'))sbEditing=null;pmTab=tab;isbTab('pm',renderPmSidebar);}
/* ONE LEVEL DEEPER THAN isbTab(). The User tab has its own bar — Company
   Details / Company Concern Person — and switching it used to write the whole
   panel back with innerHTML: the outer tab bar, the sub-tab bar and the body,
   all destroyed and rebuilt to change the half of the panel below the sub-tabs.

   That is the same mistake isbTab() exists to avoid, so this fixes it the same
   way: render the panel off-document, lift out only the sub-body, and swap
   that. The two bars above it are never touched, so nothing flickers, focus
   stays on the button you clicked, and the sliding marker actually TRAVELS
   between the two sub-tabs instead of being re-planted by tab-slide.js's
   rebuilt-bar fallback.

   Falls back to the full write if the panel shape is not what we expect —
   a correct repaint beats a clever one that quietly does nothing. */
function pmSetUserSubTab(tab){
  pmUserSubTab=tab;
  const live=document.getElementById('pm-user-subbody');
  const bar=document.querySelector('.pm-user-subtabs');
  if(!live||!bar){
    const inner=document.getElementById('pm-isb-inner');
    if(inner)inner.innerHTML=renderPmSidebar();
    return;
  }
  const tpl=document.createElement('div');
  tpl.innerHTML=renderPmSidebar();
  const next=tpl.querySelector('#pm-user-subbody');
  if(!next){
    const inner=document.getElementById('pm-isb-inner');
    if(inner)inner.innerHTML=renderPmSidebar();
    return;
  }
  live.innerHTML=next.innerHTML;
  // The buttons stay; only the highlight moves, which is what lets the marker
  // transition rather than appear.
  bar.querySelectorAll('.pm-user-subtab').forEach(function(b,i){
    b.classList.toggle('active',
      tpl.querySelectorAll('.pm-user-subtab')[i].classList.contains('active'));
  });
}
// Cancel drops the pending step too, so the form falls back to the plain
// "add a log" state rather than still claiming a move the user backed out of.
function pmCancelLog(){
  csClear('pm-log-status-sel');
  const inp=document.getElementById('pm-log-comment-inp');if(inp)inp.value='';
  if(pmPendingStatus){pmPendingStatus='';isbTab('pm',renderPmSidebar);}
}
function pmSaveLog(orderId){
  const sel=csTrigger('pm-log-status-sel');
  const inp=document.getElementById('pm-log-comment-inp');
  if(!sel||!inp)return;
  const status=getCSValue('pm-log-status-sel');
  const comment=inp.value.trim();
  if(!status){sel.style.borderColor='#b83a3a';setTimeout(()=>{sel.style.borderColor='';},1500);return;}
  if(!comment){inp.style.borderColor='#b83a3a';setTimeout(()=>{inp.style.borderColor='';},1500);return;}
  const st=stampNow();
  if(!pmLogsData[orderId])pmLogsData[orderId]=[];
  pmLogsData[orderId].unshift({date:st.date,time:st.time,user:CURRENT_USER,status,action:comment});
  pmPendingStatus='';
  /* A status that belongs to the invoice flow is a real move: the row badge,
     the menu's checkmark and the Active/Pending/Closed counters all read from
     invoiceStatus, so they need the new value. The free-form log statuses
     (Follow Up, Revision…) are notes and deliberately leave it alone. */
  const p=paymentsData.find(x=>x.id===orderId);
  const moved=!!p&&pmInvoiceFlow.indexOf(status)>=0&&p.invoiceStatus!==status;
  if(moved)p.invoiceStatus=status;
  if(moved)renderADTPage();else isbTab('pm',renderPmSidebar);
  showToast('Log added','success',moved
    ? 'Order '+p.orderId+' moved to '+status+'.'
    : 'Payment log saved with status "'+status+'".');
}
/* AI fetched results for a Payments log - the order fields the move writes.
   A step of the invoice flow is written by pmSaveLog; the other log statuses
   are where the order itself stands, so they land on Order Status. Paying an
   invoice clears what is due, and the billed amount is kept so moving it back
   to Unpaid or Pending restores it. */
function pmAiFields(p,v){
  const st=stampNow(),rows=[];
  const due=parseFloat(String(p.amountDue).replace(/[^\d.]/g,''))||0;
  const cur=String(p.amountDue).split(' ')[0];
  if(pmInvoiceFlow.indexOf(v)>=0){
    rows.push({label:'Invoice Status',from:p.invoiceStatus,to:v});
    if(v==='Paid'&&due>0){
      rows.push({label:'Amount Due',from:p.amountDue,to:cur+' 0.00',obj:p,key:'amountDue'});
      rows.push({hidden:true,to:p.amountDue,obj:p,key:'amountBilled'});
    }else if((v==='Unpaid'||v==='Pending')&&due===0&&p.amountBilled){
      rows.push({label:'Amount Due',from:p.amountDue,to:p.amountBilled,obj:p,key:'amountDue'});
    }
  }else rows.push({label:'Order Status',from:p.orderStatus,to:v,obj:p,key:'orderStatus'});
  rows.push({label:'Last Updated',from:p.lastUpdated,to:st.date+' | '+lplTime(st.time).toLowerCase(),obj:p,key:'lastUpdated'});
  return rows;
}
/* "AI fetched results" context for a Payments move. Money moves need the
   money: what is due, against what was billed, on what terms, and who to
   chase. Closing or winding an order down needs nothing still owed. An
   extension needs the end date being moved. Follow-ups and discussion notes
   get nothing - the comment is the content. */
function pmAiContext(p,v){
  if(v===p.invoiceStatus||v===p.orderStatus)return null;
  const s=p.sales||{},e=p.emp||{},concern=(p.user&&p.user.concern)||{};
  const due=parseFloat(String(p.amountDue).replace(/[^\d.]/g,''))||0;
  const term={label:'Payment Term',value:s.paymentTerm!=null&&s.paymentTerm!==''?s.paymentTerm+' days':''};
  const owed={label:'Amount Due',value:p.amountDue,state:due>0?'warn':'ok',note:due>0?'Still owed on this order':''};
  switch(v){
    case 'Paid':
      return {title:'Recording the payment',rows:[
        {label:'Amount Due',value:p.amountDue,state:due>0?'ok':'warn',note:due>0?'':'Nothing is due on this invoice'},
        {label:'Invoice Total',value:s.totalAmount},
        {label:'Billed To',value:s.companyName},term]};
    case 'Unpaid':case 'Pending':
      return {title:'Who to follow up with',rows:[
        {label:'Amount',value:due>0?p.amountDue:(p.amountBilled||s.totalAmount)},
        {label:'Billed To',value:s.companyName},
        {label:'Contact',value:s.contactPersonName||concern.name},
        {label:'Email',value:concern.email},term]};
    case 'Closed':case 'Finance Completed':case 'Logistic Completed':case 'Inactive':
      return {title:'Nothing should be outstanding',rows:[owed,{label:'Order Period',value:p.startFrom&&p.endTo?p.startFrom+' – '+p.endTo:''}]};
    case 'Offboarding':case 'Logistic Terminated':case 'Finance Termination':
      return {title:'Winding the order down',rows:[
        {label:'Employee',value:e.name||p.name},
        {label:'Order Ends',value:p.endTo},owed]};
    case 'Onboarding':
      return {title:'Who is being onboarded',rows:[
        {label:'Employee',value:e.name||p.name},
        {label:'Starts',value:p.startFrom},
        {label:'Working Country',value:p.workingCountry},
        {label:'Employee Status',value:e.status}]};
    case 'Order Extension':
      return {title:'The term being extended',rows:[
        {label:'Current End',value:p.endTo},
        {label:'Rate',value:s.rate&&s.rateType?s.rate+' / '+s.rateType:s.rate},
        {label:'Contract Period',value:s.contractPeriod?s.contractPeriod+' days':''}]};
  }
  return null;
}
function renderPmSidebar(){
  const editBtn='<button class="lp-sb-view-edit-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>';
  const p=paymentsData.find(x=>x.id===pmSelectedId);if(!p)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'sales-details',label:'Sales Details'},{id:'taxes-details',label:'Taxes Details'},{id:'user',label:'User'},{id:'employee',label:'Employee'},{id:'attachments',label:'Attachments'},{id:'timesheets',label:'Timesheets'},{id:'receivable',label:'Receivable'},{id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'pm-isb-tabs\')" title="Scroll left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>'
    +'<div class="lp-isb-tabs" id="pm-isb-tabs">'+tabs.map(t=>'<button class="lp-isb-tab'+(pmTab===t.id?' active':'')+'" onclick="navPmTab(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'pm-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closePmSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const iId='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg>';
  const iUser='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iGlobe='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const iTag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const iDoc='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  const iMail='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  const iPhone='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.2.73.43 1.44.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.9-.87a2 2 0 0 1 2.11-.45c1.37.27 2.08.5 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>';
  const iCheck='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const iDollar='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
  const iPin='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  const fc=(ico,label,val)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
  const pmEmptyTab=(label)=>'<div style="display:flex;align-items:center;justify-content:center;padding:48px 20px;color:#9ca3af;font-size:13px">'+label+' content coming soon.</div>';
  let body='';
  if(pmTab==='basic-details'){
    if(sbIsEditing('pm',p.id))body=sbHero({icon:sbIco.receipt,name:'Order #'+p.orderId,meta:[p.name,p.type,p.amountDue],status:sbHeroBadge(p.invoiceStatus),editing:true})+sbEditFormHTML('pm',p);
    else body=sbHero({icon:sbIco.receipt,name:'Order #'+p.orderId,meta:[p.name,p.type,p.amountDue],status:sbHeroBadge(p.invoiceStatus),edit:sbEditBtnFor('pm',p.id)})
      +'<div class="lp-sb-detail-grid">'
      +fc(iId,'Key',p.key)+fc(iId,'Deal ID',p.dealId)
      +fc(iDoc,'Entity Name',p.entityName)+fc(iTag,'Added From',p.addedFrom)
      +fc(iCal,'Created Time','<span style="color:var(--orange)">'+p.createdTime+'</span>')+fc(iId,'Course ID',p.courseId)
      +fc(iDoc,'Course Name',p.courseName)+fc(iCal,'Last Updated',p.lastUpdated)
      +fc(iCal,'Start From','<span style="color:var(--orange)">'+p.startFrom+'</span>')+fc(iCal,'End To','<span style="color:var(--orange)">'+p.endTo+'</span>')
      +fc(iGlobe,'Working Country','<strong>'+p.workingCountry+'</strong>')+fc(iTag,'Order Category','<span style="color:var(--orange)">'+p.orderCategory+'</span>')
      +'</div>';
  }else if(pmTab==='sales-details'){
    const s=p.sales||{};
    /* The record's header card on top, Edit inside it — the app's standard
       place for it on every tab. Edit turns this tab into its form in place
       (the 'pms' editor, registered beside 'pm' below); until then every
       field, Payment Cycle included, is read-only text. */
    const hero=function(o){return sbHero(Object.assign({icon:sbIco.receipt,name:'Order #'+p.orderId,
      meta:[p.name,p.type,p.amountDue],status:sbHeroBadge(p.invoiceStatus)},o));};
    if(sbIsEditing('pms',p.id))body=hero({editing:true})+sbEditFormHTML('pms',s);
    else body=hero({edit:sbEditBtnFor('pms',p.id)})
      +'<div class="lp-sb-detail-grid">'
      +fc(iId,'Company ID',s.companyId)+fc(iDoc,'Company Name',s.companyName)
      +fc(iId,'Contact Person ID',s.contactPersonId)+fc(iUser,'Contact Person Name',s.contactPersonName)
      +fc(iDollar,'Rate Type',s.rateType)+fc(iCal,'Payment Cycle',tsbCycle(p))
      +fc(iDollar,'Rate',s.rate)+fc(iCal,'Days',s.days)
      +fc(iDollar,'Total Amount',s.totalAmount)
      +fc(iCal,'Contract Period',s.contractPeriod)+fc(iPin,'Work Location',s.workLocation)
      +fc(iCal,'Timesheet Period Date',s.tsPeriodDate)+fc(iDoc,'Payment Term',s.paymentTerm)
      +'</div>';
  }else if(pmTab==='taxes-details'){
    body=pmEmptyTab('Taxes Details');
  }else if(pmTab==='user'){
    const u=p.user||{};
    const subTabs=[{id:'company-details',label:'Company Details'},{id:'concern-person',label:'Company Concern Person'}];
    const subTabBar='<div class="pm-user-subtabs">'+subTabs.map(t=>'<button class="pm-user-subtab'+(pmUserSubTab===t.id?' active':'')+'" onclick="pmSetUserSubTab(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>';
    let subBody='';
    if(pmUserSubTab==='concern-person'){
      const c=u.concern||{};
      subBody='<div class="lp-sb-view-header"><span></span>'+editBtn+'</div>'
        +'<div class="lp-sb-detail-grid">'
        +fc(iId,'Key',c.key)+fc(iUser,'Name',c.name)
        +fc(iPhone,'Mobile',c.mobile)+fc(iMail,'Email',c.email)
        +fc(iCal,'Date',c.date)+fc(iUser,'Create By',c.createBy)
        +fc(iPin,'Address',c.address)
        +'</div>';
    }else{
      const co=u.company||{};
      subBody='<div class="lp-sb-view-header"><span></span>'+editBtn+'</div>'
        +'<div class="lp-sb-detail-grid">'
        +fc(iId,'User ID',co.userId)+fc(iUser,'Concern Person Name',co.concernPersonName)
        +fc(iDoc,'Company Name',co.companyName)+fc(iUser,'User First Name',co.firstName)
        +fc(iUser,'User Last Name',co.lastName)+fc(iMail,'User Email',co.email)
        +fc(iPhone,'User Mobile',co.mobile)+fc(iPhone,'User Alt Mobile',co.altMobile)
        +fc(iDoc,'Users Company Website',co.website)+fc(iPin,'User Address',co.address)
        +'</div>';
    }
    // The id is the seam pmSetUserSubTab() swaps on — everything above it,
    // including this bar, survives a sub-tab change untouched.
    body=subTabBar+'<div id="pm-user-subbody">'+subBody+'</div>';
  }else if(pmTab==='employee'){
    const emp=p.emp;
    body='<div class="lp-sb-detail-grid">'
      +fc(iId,'Employee ID',emp.empId)+fc(iCheck,'Status',sbStatus(emp.status))
      +fc(iUser,'Name',emp.name)+fc(iMail,'Email','<span style="color:var(--orange)">'+emp.email+'</span>')
      +fc(iPhone,'Mobile',emp.mobile)+fc(iCal,'Created On','<span style="color:var(--orange)">'+emp.createdOn+'</span>')
      +'</div>';
  }else if(pmTab==='attachments'){
    body=attachTabHTML('pm',pmSelectedId);
  }else if(pmTab==='timesheets'){
    body=tsbApprovalTabHTML(p);   // js/ts-billing.js
  }else if(pmTab==='receivable'){
    const yrOpts=[2026,2025,2024].map(y=>'<option'+(y===2026?' selected':'')+'>'+y+'</option>').join('');
    const plusIco='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    body='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:18px">'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<span style="font-size:13px;font-weight:600;color:var(--navy)">Select Year :</span>'
      +'<select style="border:1px solid var(--border);border-radius:8px;padding:5px 10px;font-family:inherit;font-size:13px;color:var(--navy);cursor:pointer;outline:none">'+yrOpts+'</select>'
      +'</div>'
      +'<button onclick="startAddInvoice()" style="border:none;background:none;color:var(--orange);font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;font-family:inherit">'+plusIco+' Create Invoice</button>'
      +'</div>'
      +tsbReceivableHTML(p);   // invoice drafts from approved timesheets - js/ts-billing.js
  }else if(pmTab==='history'){
    body=sbHistoryHTML(p);
  }else if(pmTab==='logs'){
    const logs=pmLogsData[p.id]||[];
    const pmLogKey=(st)=>({Active:'active',Paid:'active',Closed:'active',Inactive:'inactive',Unpaid:'inactive'}[st]||'default');
    /* The invoice flow and the free-form log statuses are two different lists,
       and a step picked from the row menu comes from the first one - so the
       select has to offer both or the pre-selection would match nothing. The
       flow leads, since that is the move being recorded. */
    const seen={};
    const statusOpts=pmInvoiceFlow.concat(pmLogStatusOptions).filter(s=>seen[s]?false:(seen[s]=true));
    // Opened from the row menu the form states the move it is about; opened from
    // the tab it is the plain "add a log" form it has always been.
    const headHTML=pmPendingStatus
      ?'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+pmLogKey(pmPendingStatus)+'"></span>Next: '+pmPendingStatus+'</div>'
       +'<p class="lp-logs-form-sub">Move order '+p.orderId+' from '+p.invoiceStatus+' to '+pmPendingStatus+' and record why.</p>'
      :'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+pmLogKey(p.invoiceStatus)+'"></span>'+p.invoiceStatus+'</div>'
       +'<p class="lp-logs-form-sub">Update invoice status and add a comment</p>';
    const formHTML='<div class="lp-logs-form">'
      +headHTML
      +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
      +apCS('pm-log-status-sel',statusOpts,pmPendingStatus||'','None - Please Select Status')
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="pm-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px">'
      +'<button class="ep-cancel-btn" onclick="pmCancelLog()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="background:var(--navy)" onclick="pmSaveLog('+p.id+')">Save</button>'
      +'</div>'
      +'</div>';
    body=lpLogsView(logs,formHTML,{current:p.invoiceStatus,open:pmPendingStatus||'',select:'auto',aiFields:function(v){return pmAiFields(p,v);},
      // Recording a payment or raising an extension is a submission; the rest
      // of the flow is follow-up and close-out.
      aiWhen:function(v){return v==='Paid'||v==='Order Extension';},
      aiContext:function(v){return pmAiContext(p,v);}});
  }else if(pmTab==='workflow'){
    body=wfTimelineHTML(wfPayment(p));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function buildPaymentsHTML(){
  const dotsIco='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const activeCount=paymentsData.filter(p=>p.invoiceStatus==='Paid').length;
  const pendingCount=paymentsData.filter(p=>p.invoiceStatus==='Unpaid'||p.invoiceStatus==='Pending').length;
  const filtered=pmInvoiceStatusFilter?(pmInvoiceStatusFilter==='__pending_group__'?paymentsData.filter(p=>p.invoiceStatus==='Unpaid'||p.invoiceStatus==='Pending'):paymentsData.filter(p=>p.invoiceStatus===pmInvoiceStatusFilter)):paymentsData;
  if(pmSelectedId&&!filtered.some(p=>p.id===pmSelectedId))pmSelectedId=null;
  const pgn=listPage('payments',pmInvoiceStatusFilter+'|'+pmSearchQuery,lpSearchRows(filtered,pmSearchQuery).map((p,i)=>{
    return '<tr class="pm-row'+(pmSelectedId===p.id?' lp-row-selected':'')+'" id="pm-row-'+p.id+'" style="cursor:pointer" onclick="openPmSidebar('+p.id+')">'
      +'<td style="color:#6b7280;font-size:13px">'+(i+1)+'</td>'
      +'<td style="font-weight:600;color:var(--navy)">'+p.orderId+'</td>'
      +'<td style="font-weight:600;color:var(--navy)">'+p.name+'</td>'
      +'<td style="color:var(--orange);font-weight:600">'+p.amountDue+'</td>'
      +'<td>'+p.type+'</td>'
      +'<td><span class="lp-status-badge '+statusClass(p.orderStatus)+'">'+p.orderStatus+'</span></td>'
      // A status, read-only here; it is changed from the record's panel.
      +'<td><span class="lp-status-badge tone-'+statusTone(p.invoiceStatus)+'">'+p.invoiceStatus+'</span></td>'
      +'<td onclick="event.stopPropagation()">'+rowLogCell('payments',p.id)+'</td>'
      +'</tr>';
  }),'<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--gray)">No payments match this filter.</td></tr>');
  const sbInner=pmSelectedId?renderPmSidebar():'';
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0"><div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('pm-f-q',pmSearchQuery,'Search invoice, client','applyPmFilters()')
    +apCS('pm-f-country',['Netherlands','Belgium','USA','India','Germany'],'','Country')
    +apCS('pm-f-status',['Unpaid','Pending','Paid'],pmInvoiceStatusFilter==='__pending_group__'?'':pmInvoiceStatusFilter,'Status')
    +apCD('pm-f-date',pmDateFilter,'Select date')
    +clearFiltersBtn([pmInvoiceStatusFilter,pmSearchQuery],'resetPmFilters()')+'<button class="lp-pill-search" onclick="applyPmFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats" style="flex-shrink:0">'
    +'<div class="listing-stat active'+(pmInvoiceStatusFilter==='Paid'?' stat-selected':'')+'" onclick="pmToggleStatFilter(\'Paid\')"><div class="listing-stat-count">'+activeCount+'</div><div class="listing-stat-label">Active</div></div>'
    +'<div class="listing-stat pending'+(pmInvoiceStatusFilter==='__pending_group__'?' stat-selected':'')+'" onclick="pmToggleStatFilter(\'__pending_group__\')"><div class="listing-stat-count">'+pendingCount+'</div><div class="listing-stat-label">Pending</div></div>'
    +'</div></div>'
    +'<div class="lp-split-wrap" style="margin-top:14px"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr>'
    +'<th>S. No</th><th>Order ID</th><th>Name</th><th>Amount Due</th><th>Type</th><th>Order Status</th><th>Invoice Status</th><th>Action</th>'
    +'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(pmSelectedId?' open':'')+'" id="pm-split-sb"><div class="lp-isb" id="pm-isb-inner">'+sbInner+'</div></div>'
    +'</div></div>'
    +(pmCreateOpen?buildCreateInvoiceModalHTML():'');
}
function closePmMenus(){document.querySelectorAll('.ct-action-menu').forEach(m=>m.classList.remove('open'));}
function ctSlug(s){return(s||'').toLowerCase().replace(/\s+/g,'-');}
function ctStatusBadge(s){return'<span class="ct-sb-badge '+ctSlug(s)+'">'+s+'</span>';}
function ctNextStep(status){const i=ctFlow.indexOf(status);return i>=0&&i<ctFlow.length-1?ctFlow[i+1]:null;}
function toggleCtAction(id,e){
  if(e)e.stopPropagation();
  document.querySelectorAll('.ct-action-menu').forEach(m=>{if(m.id!=='ctm-'+id)m.classList.remove('open');});
  const m=document.getElementById('ctm-'+id);if(!m)return;
  const willOpen=!m.classList.contains('open');
  m.classList.toggle('open');
  if(willOpen&&e){
    const wrap=e.target.closest('.ct-action-wrap');
    if(wrap)placeActionMenu(m,wrap);
  }
}
// ── TICKETS SIDEBAR ──
function openTkSidebar(id,tab){tkTab=tab||sbKeepTab(tkSelectedId,tkTab);tkSelectedId=id;const sb=document.getElementById('tk-split-sb');if(sb)sb.classList.add('open');isbTab('tk',renderTkSidebar);document.querySelectorAll('.tk-row').forEach(r=>r.classList.toggle('lp-row-selected',r.id==='tk-row-'+id));}
function closeTkSidebar(){tkSelectedId=null;const sb=document.getElementById('tk-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.tk-row').forEach(r=>r.classList.remove('lp-row-selected'));}
function navTkTab(tab){tkTab=tab;isbTab('tk',renderTkSidebar);}
// Stored keys are snake_case; these are how they read. Shared by the table pill
// and by sbStatus() in the detail panel so the two never drift apart.
const TK_STATUS_LABEL={open:'Open',in_progress:'In Progress',blocked:'Blocked',resolved:'Resolved',closed:'Closed'};
function tkStatusLabel(s){return TK_STATUS_LABEL[s]||s;}
function tkStatusBadge(s){const m={open:{bg:'var(--st-info-bg)',c:'var(--st-info-fg)',b:'var(--st-info-bd)'},in_progress:{bg:'var(--st-wait-bg)',c:'var(--st-wait-fg)',b:'var(--st-wait-bd)'},blocked:{bg:'var(--st-bad-bg)',c:'var(--st-bad-fg)',b:'var(--st-bad-bd)'},resolved:{bg:'var(--st-ok-bg)',c:'var(--st-ok-fg)',b:'var(--st-ok-bd)'},closed:{bg:'var(--st-idle-bg)',c:'var(--st-idle-fg)',b:'var(--st-idle-bd)'}};const v=m[s]||{bg:'var(--st-idle-bg)',c:'var(--st-idle-fg)',b:'var(--st-idle-bd)'};return'<span style="background:'+v.bg+';color:'+v.c+';border:1.5px solid '+v.b+';border-radius:999px;padding:3px 10px;font-size:11px;font-weight:600;display:inline-block;white-space:nowrap">'+tkStatusLabel(s)+'</span>';}
// ── CHATS SIDEBAR ──
function openChatSidebar(id,tab){chatTab=tab||sbKeepTab(chatSelectedId,chatTab);chatSelectedId=id;const sb=document.getElementById('chat-split-sb');if(sb)sb.classList.add('open');isbTab('chat',renderChatSidebar);document.querySelectorAll('.chat-row').forEach(r=>r.classList.toggle('lp-row-selected',r.id==='chat-row-'+id));}
function closeChatSidebar(){chatSelectedId=null;const sb=document.getElementById('chat-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.chat-row').forEach(r=>r.classList.remove('lp-row-selected'));}
function navChatTab(tab){chatTab=tab;isbTab('chat',renderChatSidebar);}
/* Seeded from the chat's own start details rather than written out per record,
   so the two opening entries can never disagree with the chat above them. */
function chatSeedLogs(c){
  const parts=String(c.startedAt||'').split('|');
  const d=(parts[0]||'').trim(),t=(parts[1]||'').trim();
  if(!chatLogsData[c.id])chatLogsData[c.id]=[
    {date:d,time:t,user:'System',status:chatStatusLabel(c.status),
     action:'Auto-assigned to '+c.assignedTo+'.'},
    {date:d,time:t,user:c.clientName,status:'Active',
     action:'Chat opened by '+c.clientName+'.'}
  ];
  return chatLogsData[c.id];
}
function chatCancelLog(){isbTab('chat',renderChatSidebar);}
/* Written by hand rather than through lpCommitLog because a chat's status is a
   KEY ('waiting_csm') shown under a LABEL ('Waiting for CSM'). lpCommitLog
   assigns the option text straight onto the record, which would have stored
   the label and broken every status lookup on the listing. */
/* Written once and read back once: the dropdown carries a move's label, the
   record carries its target status. */
function chatMoveLabel(m){return m.label+' → '+chatStatusLabel(m.to);}
function chatSaveLog(id){
  const c=chatsData.find(function(x){return x.id===id;});if(!c)return;
  const sel=csTrigger('chat-log-status-sel');
  const inp=document.getElementById('chat-log-comment-inp');
  const picked=getCSValue('chat-log-status-sel');
  const mv=chatMoves(c).find(function(m){return chatMoveLabel(m)===picked;});
  const to=mv?mv.to:'',comment=inp?inp.value.trim():'';
  const flash=function(el){if(el){el.style.borderColor='#b83a3a';setTimeout(function(){el.style.borderColor='';},1500);}};
  if(!to){flash(sel);return;}
  if(!comment){flash(inp);return;}
  const was=c.status;
  chatSeedLogs(c);
  const s=stampNow();
  chatLogsData[c.id].unshift({date:s.date,time:s.time,user:CURRENT_USER,
    status:chatStatusLabel(to),action:comment});
  c.status=to;
  renderADTPage();
  showToast('Chat updated','success',c.chatId+' → '+chatStatusLabel(to)
    +' · next action on '+chatOwner(c)+'.');
}
function setChatFilter(f){chatStatusFilter=f;chatSelectedId=null;renderADTPage();}
const CHAT_STATUS_LABEL={active:'Active',waiting_client:'Waiting for Client',waiting_csm:'Waiting for CSM',inactive:'Inactive'};
function chatStatusLabel(s){return CHAT_STATUS_LABEL[s]||s;}
function chatStatusBadge(s){const m={active:{bg:'var(--st-ok-bg)',c:'var(--st-ok-fg)',b:'var(--st-ok-bd)'},waiting_client:{bg:'var(--st-wait-bg)',c:'var(--st-wait-fg)',b:'var(--st-wait-bd)'},waiting_csm:{bg:'var(--st-wait-bg)',c:'var(--st-wait-fg)',b:'var(--st-wait-bd)'},inactive:{bg:'var(--st-bad-bg)',c:'var(--st-bad-fg)',b:'var(--st-bad-bd)'}};const v=m[s]||{bg:'var(--st-idle-bg)',c:'var(--st-idle-fg)',b:'var(--st-idle-bd)'};return'<span style="background:'+v.bg+';color:'+v.c+';border:1.5px solid '+v.b+';border-radius:999px;padding:3px 10px;font-size:11px;font-weight:600;display:inline-block;white-space:nowrap">'+chatStatusLabel(s)+'</span>';}
/* ══ STATUS POPUP ════════════════════════════════════════════════════════════
   Picking a stage from a row's status dropdown opens this popup over the
   listing instead of the detail panel's Logs tab: the move is one decision,
   and opening a five-tab panel to make it hid the list the user was working
   through. It is the same form the Logs tab has (status + mandatory comment),
   in the same .ct-modal shell as every other popup, and it commits through the
   same ctSaveLog(), so both routes write identical registry events.

   ctMoveOptions() only allows one stage forward. A later stage picked from the
   menu is therefore offered as the next legal one, with a line saying why,
   rather than letting the popup skip stages the Logs tab would refuse. */
let ctStatusModal=null;   // {id, to} while the popup is open
function ctPickStatus(contractId,status){
  document.querySelectorAll('.ct-action-menu').forEach(m=>m.classList.remove('open'));
  ctStatusModal={id:contractId,to:status};
  renderADTPage();
  const inp=document.getElementById('ct-sm-comment-inp');if(inp)inp.focus();
}
function closeCtStatusModal(){ctStatusModal=null;renderADTPage();}
function ctStatusModalToLog(){
  const id=ctStatusModal&&ctStatusModal.id;
  ctStatusModal=null;
  renderADTPage();
  if(id)openCtSidebar(id,'logs');
}
function ctStatusModalKey(e){if(e.key==='Escape'&&ctStatusModal&&page==='contracts')closeCtStatusModal();}
document.addEventListener('keydown',ctStatusModalKey);
function buildCtStatusModalHTML(){
  const c=ctStatusModal&&contractsData.find(function(x){return x.id===ctStatusModal.id;});
  if(!c){ctStatusModal=null;return '';}
  const opts=ctMoveOptions(c);
  const asked=ctStatusModal.to;
  const allowed=opts.indexOf(asked)>=0;
  const preset=allowed?asked:(opts[1]||c.status);
  const xSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const arrow='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-sm" style="width:min(540px,92vw)" role="dialog" aria-modal="true" aria-label="Update contract status" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Update Status</span><button class="ct-modal-close" onclick="closeCtStatusModal()" aria-label="Close">'+xSvg+'</button></div>'
    +'<p class="ct-modal-sub">'+c.contractId+' &middot; '+c.empName+' &middot; '+ctTypeCfg(c.type).label+'</p>'
    +'<div class="ct-sm-move">'+ctStatusBadge(c.status)+arrow+ctStatusBadge(preset)+'</div>'
    +(allowed?'':'<div class="ct-sm-note">Contracts move one stage at a time. <b>'+asked+'</b> opens up once this contract reaches <b>'+preset+'</b>.</div>')
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Status <span class="req">*</span></label>'
      +apCS('ct-sm-status-sel',opts,preset,'Select Status')+'</div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Comment <span class="req">*</span></label>'
      +'<textarea id="ct-sm-comment-inp" class="ep-form-input" rows="4" placeholder="Why is this contract moving?" style="resize:vertical;min-height:90px;height:auto;line-height:1.5"></textarea></div>'
    +'</div>'
    +'<div class="ct-modal-foot">'
      +'<button class="add-link" onclick="ctStatusModalToLog()">View full log</button>'
      +'<div class="ct-modal-btns">'
        +'<button class="ep-cancel-btn" onclick="closeCtStatusModal()">Cancel</button>'
        +'<button class="ep-save-btn" onclick="ctSaveLog('+c.id+',\'ct-sm-status-sel\',\'ct-sm-comment-inp\')">Submit</button>'
      +'</div>'
    +'</div>'
    +'</div></div>';
}
function ctToggleStatFilter(v){
  ctQuickStatusFilter=ctQuickStatusFilter===v?'':v;
  ctSelectedId=null;
  renderADTPage();
}
function applyCtFilters(){
  const status=getCSValue('ct-f-status');
  const country=getCSValue('ct-f-country');
  const inp=document.getElementById('ct-search-inp');
  /* The placeholder is not one of the options, so an untouched control reads
     back empty - but guard the label anyway in case one is ever added. */
  ctQuickStatusFilter=status&&status!=='All Statuses'?status:'';
  ctCountryFilter=country&&country!=='All Countries'?country:'';
  ctSearchQuery=inp?inp.value:'';
  ctSelectedId=null;
  renderADTPage();
}
/* Reset clears everything INCLUDING the type band, per the PRD: Reset reloads
   the full list, and a "full list" that is still scoped to one type is not
   one. */
function resetCtFilters(){
  ctQuickStatusFilter='';
  ctCountryFilter='';
  ctSearchQuery='';
  ctTypeFilter=CT_TYPE_ALL;
  ctSelectedId=null;
  renderADTPage();
}
function openCtSidebar(id,tab,pendingStatus){
  if(ctSelectedId!=null&&String(ctSelectedId)!==String(id)&&sbLeaveGuard('ct',function(){openCtSidebar(id,tab,pendingStatus);}))return;
  ctTab=tab||sbKeepTab(ctSelectedId,ctTab);ctSelectedId=id;
  if(pendingStatus)window._ctPendingStatus=pendingStatus;else delete window._ctPendingStatus;
  const sb=document.getElementById('ct-split-sb');if(sb)sb.classList.add('open');
  isbTab('ct',renderCtSidebar);   // body-only swap when the panel is already open
  document.querySelectorAll('.ct-row').forEach(r=>r.classList.toggle('lp-row-selected',r.id==='ct-row-'+id));
}
function closeCtSidebar(){if(sbLeaveGuard('ct',closeCtSidebar))return;sbEditing=null;
  ctSelectedId=null;delete window._ctPendingStatus;
  const sb=document.getElementById('ct-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.ct-row').forEach(r=>r.classList.remove('lp-row-selected'));
}
function navCtTab(tab){if(!sbHasDraft('ct'))sbEditing=null;ctTab=tab;isbTab('ct',renderCtSidebar);}
function pmToggleStatFilter(v){
  pmInvoiceStatusFilter=pmInvoiceStatusFilter===v?'':v;
  pmSelectedId=null;
  renderADTPage();
}
function applyPmFilters(){
  const status=getCSValue('pm-f-status');
  pmInvoiceStatusFilter=status&&status!=='Status'?status:'';
  // Held so the picked date survives the repaint. It does not narrow the rows
  // yet — the control was decorative before this and still is; only its UI changed.
  pmDateFilter=getCDValue('pm-f-date')||'';
  pmSearchQuery=lpSearchValue('pm-f-q');
  pmSelectedId=null;
  renderADTPage();
}
function resetPmFilters(){
  pmInvoiceStatusFilter='';pmDateFilter='';pmSearchQuery='';
  pmSelectedId=null;
  renderADTPage();
}
function openCtModal(id){
  const c=contractsData.find(x=>x.id===id);if(!c)return;
  const g=(l,v)=>'<div class="ct-modal-field"><div class="ct-modal-flabel">'+l+'</div><div class="ct-modal-fval">'+(v||'--')+'</div></div>';
  document.getElementById('ct-modal-overlay').innerHTML=
    '<div class="ct-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Contract — '+c.empName+'</span><button class="ct-modal-close" onclick="closeCtModal()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'<div class="ct-modal-grid">'
    +g('Contract ID',c.contractId)+g('Employee',c.empName)
    +g('Country of Operation',c.countryOfOp)+g('Employment Type',c.empType)
    +g('Job Title',c.jobTitle)+g('Employment Duration',c.empDuration)
    +g('Pay Amount',c.currency+' '+c.payAmount)+g('Pay Frequency',c.payFrequency)
    +g('Status',c.status)+g('Date',c.date)
    +'</div>'
    +'<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:14px 16px;margin-bottom:18px;display:flex;align-items:center;gap:10px">'
    +'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
    +'<span style="font-size:13px;font-weight:600;color:#15803d">Contract has been approved and is finalized.</span></div>'
    +'<div style="display:flex;justify-content:flex-end;gap:10px">'
    +'<button class="ep-cancel-btn" onclick="closeCtModal()">Close</button>'
    +'<button class="ep-save-btn">Download Contract</button>'
    +'</div>'
    +'</div>';
  document.getElementById('ct-modal-overlay').style.display='flex';
}
function closeCtModal(){document.getElementById('ct-modal-overlay').style.display='none';}
/* ══ CONTRACT LOGS TAB ══════════════════════════════════════════════════════
   PRD section 7, drawn in the SHARED logs design — the same .lp-logs-* two
   column panel Compliance, Leave Policies, Payheads, Teams, Payroll and the
   employee lifecycle all use: avatar timeline on the left, the form that moves
   the record on the right.

   It used to have a timeline of its own — day headers, a family icon and tag
   per row, a prev -> new chip pair — and an action panel of its own, with a
   button named after the next stage and a separate "revert" disclosure. That
   made Contracts the one module whose history looked like a different
   product. All of it is gone: this tab is now the same two columns, the same
   cards and the same Status + Comment + Cancel/Submit form as everywhere
   else. Nothing about the EVENTS changed in the move; only the shell they are
   drawn in, and where the forward/backward decision is taken (see ctSaveLog).

   Two rules from the PRD survive the move, because they are about the content
   of a row rather than its chrome:

   1. LABELS COME FROM THE REGISTRY, ALREADY TYPE-CORRECT. Nothing here builds
      a label by pasting a type onto a stage name at render time. An
      Immigration record shows "Proposal sent"; an EOR record shows "Quote
      sent"; both are the canonical QUOTE_SENT. Concatenating would produce
      "Immigration Quote sent", which is a phrase this product does not use.

   2. A COMMENT IS CONTENT, NOT A HEADING. Rejections in ADT carry no reason
      CODE — only free text. Rendering that text as the row's title would make
      one person's sentence look like a categorical reason the system
      assigned. So the label is the heading, and the comment sits below it in
      the shared Comment: row.

   NOTHING IS ADDED TO THE SHARED DESIGN HERE. A row for the step that has
   not happened yet — dashed, pending/complete, borrowed from the compliance
   panel — was tried at the top of this timeline and removed again: no other
   Logs tab in the system has such a row, so drawing it here made Contracts
   the odd one out, which is the opposite of what this rewrite was for. If a
   Logs tab genuinely needs a new kind of row, it goes into the shared design
   and every module gets it; it does not get added to one tab. */

const CT_LOG_ICO={
  person:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  cal:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  clk:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M10.3 3.6l-8 13.9A2 2 0 0 0 4 20.5h16a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
};

/* An override or a revert is a danger-tinted row for the life of the record,
   and pins a banner at the top of the Logs tab. Someone reading this record in
   six months has to see that a stage was walked back without hunting for it. */
function ctIsOverrideRow(r){return r.family==='Overrides';}

/* "AI fetched results" context for a contract move: only what THAT stage
   commits to or depends on, read off the contract.
     quote / proposal stages   the commercials being agreed
     Contract Sent             who it goes to and what it binds them to
     Contract Approved         the mandatory compliance still open
     onboarding / kickoff      right to work, start date, compliance
     filing                    the immigration facts being filed
     live (payroll / active)   what payroll will run on, and nothing pending
     Inactive                  when it was meant to end
   A comment (same stage) or a revert gets nothing: the reason is the point,
   and the stage being left is already on screen. */
function ctAiContext(c,v,back){
  if(v===c.status||back)return null;
  const cm=c.commercial||{},cur=c.currency||'';
  const money=function(x){
    if(x==null||x==='')return '';
    const n=parseFloat(String(x).replace(/[^\d.]/g,''));
    return (cur?cur+' ':'')+(isNaN(n)?x:n.toLocaleString('en-IN',{maximumFractionDigits:2}));
  };
  const span=String(c.empDuration||'').split(/\s*[–-]\s*(?=\d{4}-)/);
  const start=span[0]||'',end=span[1]||'';
  const country=c.countryOfOp||c.country;
  // Mandatory items not yet approved hold the contract up; optional ones never do.
  const open=(c.complianceItems||[]).filter(function(i){return i.note!=='Optional'&&i.status!=='Approved';});
  const comp={label:'Mandatory Compliance',wide:true,
    value:open.length?open.length+' pending':'All approved',
    state:open.length?'warn':'ok',
    note:open.length?open.map(function(i){return i.item;}).join(', '):''};
  const pay={label:'Pay',value:c.payAmount?money(c.payAmount)+(c.payFrequency?' / '+c.payFrequency.toLowerCase():''):''};
  const permit={label:'Work Permit',value:c.workPermit==null?'':c.workPermit?'Required':'Not required',
    state:c.workPermit?'warn':'',note:c.workPermit?(c.nationality||'Employee')+' national working in '+country:''};
  const commercials=[
    {label:'Monthly Invoice',value:money(cm.monthlyInvoice)},
    {label:'ADT Fee',value:money(cm.adtFee)},
    pay,
    {label:'Social Premium',value:cm.socialPremPct?cm.socialPremPct+'%':''},
    {label:'Service Type',value:c.serviceType},
    {label:'Country of Operation',value:country}];
  switch(v){
    case 'Quotation Approved':
      return {title:'The quote being approved',rows:commercials};
    case 'Proposal Sent':
      return {title:'What the proposal offers',rows:commercials.concat([{label:'Duration',value:c.empDuration}])};
    case 'Proposal Approved':
      return {title:'What the client is agreeing to',rows:[commercials[0],commercials[1],{label:'Duration',value:c.empDuration}]};
    case 'Contract Sent':
      return {title:'Who the contract goes to',rows:[
        {label:'Employee',value:c.empName},
        {label:'Sent To',value:c.email,state:c.email?'ok':'warn',note:c.email?'':'No email on the contract'},
        {label:'Role',value:c.jobTitle||c.empDesig},
        {label:'Term',value:c.empDuration},
        pay,
        {label:'Work Schedule',value:c.workSchedule?c.workSchedule+' hrs / day':''}]};
    case 'Contract Approved':
      return {title:'Before the contract is signed off',rows:[
        {label:'Employee',value:c.empName},{label:'Start Date',value:start},comp]};
    case 'Onboarding':case 'Pending Onboarding':case 'Pending Kickoff':
      return {title:'Ready to onboard?',rows:[
        {label:'Start Date',value:start},
        {label:'Nationality',value:c.nationality},
        {label:'Country of Operation',value:country},
        permit,comp]};
    case 'Ready for Filing':case 'Filed':
      return {title:'What is being filed',rows:[
        {label:'Applicant',value:c.empName},
        {label:'Nationality',value:c.nationality},
        {label:'Destination',value:country},
        {label:'Date of Birth',value:c.dob},
        permit,comp]};
    case 'Ready for Payroll':case 'Active':
      return {title:'What payroll will run on',rows:[
        pay,
        {label:'Net Pay',value:money(cm.netPay)},
        {label:'First Pay Period',value:start},
        {label:'Contract Ends',value:end},
        comp]};
    case 'Inactive':
      return {title:'Closing the contract',rows:[
        {label:'Employee',value:c.empName},
        {label:'Contract Ends',value:end,
         state:end&&new Date(end)>new Date()?'warn':'',
         note:end&&new Date(end)>new Date()?'Closing before the agreed end date':''}]};
  }
  return null;
}

function ctLogsTabHTML(c){
  const raw=ctLogsData[c.id]||[];
  const rows=raw.map(function(l){return ctLogRow(l,c.type);});
  /* A move to a stage BEHIND the current one is an override (ctSaveLog decides
     that from the stages), so those moves read as the amber "back" kind. */
  const flow=ctFlowFor(c.type),idx=flow.indexOf(c.status);
  return lpLogsView(rows,ctLogFormHTML(c),{
    isBack:function(v){const j=flow.indexOf(v);return idx>=0&&j>=0&&j<idx;},
    // Ready for Payroll / Filed / Active - the flow's last stage is a finish.
    done:idx>=0&&idx===flow.length-1,
    rowClass:function(r){return ctIsOverrideRow(r)?'is-bad':'';},
    // The AI card is for putting the contract forward - sending and filing.
    // The approval stages are the client's or reviewer's call, so they get none.
    aiWhen:function(v){const j=flow.indexOf(v);return j>idx&&/Sent$|Filing|Filed/.test(v);},
    aiContext:function(v){const j=flow.indexOf(v);return ctAiContext(c,v,idx>=0&&j>=0&&j<idx);},
    // What ctSaveLog writes: the stage, and the registry event the entry is stamped with.
    aiFields:function(v){
      const j=flow.indexOf(v),back=idx>=0&&j>=0&&j<idx;
      const key=v===c.status?'COMMENT_ADDED':back?'STATUS_REVERTED':ctEventKeyFor(c.type,v);
      const ev=key&&typeof ctEventInfo==='function'?ctEventInfo(key,c.type):null;
      return [{label:'Contract Status',from:c.status,to:v},
        {label:'Event',group:'log',to:ev?ev.label:(back?'Stage reverted':'Stage changed')},
        {label:'Visible To',group:'log',to:v===c.status||back?'Internal only':'Client and internal'}];
    }
  });
}

/* ── The form ──────────────────────────────────────────────────────────────
   The SAME form every other module's Logs tab has, and nothing else: current
   status as the header, one line of instruction, a mandatory Status select, a
   mandatory Comment, Cancel and Submit.

   Advancing and reverting used to be two separate controls here - a primary
   button named after the next stage, and a "revert to an earlier stage"
   disclosure that opened a second panel with its own select and its own
   reason box. Both are just "pick where this record goes and say why", which
   is what the Status select already is, so they are one control now. The
   distinction that MATTERS - that going backwards is an override - is not
   lost: it is decided from the stages themselves in ctSaveLog(), which is a
   more reliable place for it than which of two buttons someone pressed.

   The comment is mandatory because these rows are the only account of why a
   contract is where it is; a stage that moved with no explanation is the
   thing this tab exists to prevent. */

/* The moves this contract can actually make from where it is: stay put, step
   ONE stage forward, or go back to any stage behind it. Nothing further
   forward is offered, so a record cannot skip a stage through this control.
   Same shape as the compliance panel's ocaMoveOptions(). */
function ctMoveOptions(c){
  const flow=ctFlowFor(c.type);
  const idx=flow.indexOf(c.status);
  /* Off the flow entirely (Inactive) - there is nowhere legal to go, so the
     select offers only the status it already has and the form is a note pad. */
  if(idx<0)return [c.status];
  return [c.status]
    .concat(idx<flow.length-1?[flow[idx+1]]:[])
    .concat(flow.slice(0,idx).reverse());   // nearest stage back first
}

function ctLogFormHTML(c){
  const flow=ctFlowFor(c.type);
  const idx=flow.indexOf(c.status);
  const next=idx>=0&&idx<flow.length-1?flow[idx+1]:null;
  const back=idx>0;
  const sub=next
    ? (back?'Move this contract to '+next+', or back to an earlier stage'
           :'Move this contract to '+next+', and say why')
    : (back?'Add a comment, or move this contract back to an earlier stage'
           :'Add a comment against this contract');
  return '<div class="lp-logs-form">'
    +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+statusTone(c.status)+'"></span>'+c.status+'</div>'
    +'<p class="lp-logs-form-sub">'+sub+'</p>'
    +lpLogStatusField('ct-log-status-sel',c.status,ctMoveOptions(c))
    +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="lp-logs-form-textarea" id="ct-log-comment-inp" placeholder="Enter comment"></textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px">'
    +'<button class="ep-cancel-btn" style="flex:1" onclick="ctCancelLog()">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="ctSaveLog('+c.id+')">Submit</button>'
    +'</div></div>';
}

function ctCancelLog(){
  const inp=document.getElementById('ct-log-comment-inp');if(inp)inp.value='';
  isbTab('ct',renderCtSidebar);
}

/* Flag the field red rather than firing an alert, the same correction the
   Chats module and lpCommitLog() already use. */
function ctFlashField(el){
  if(!el)return;
  el.classList.add('is-invalid');
  el.focus();
  setTimeout(function(){el.classList.remove('is-invalid');},1600);
}

/* The one commit path. lpCommitLog() is not used here on purpose: it writes a
   bare {status, comment} row, and every row in this module has to be stamped
   with a registry event so an export stays faithful to the PRD. So this does
   lpCommitLog's job - validate, move, record - through emitContractEvent(). */
/* selId/inpId default to the Logs tab's form; the status popup passes its own
   so the two can be on screen together without reading each other's fields. */
function ctSaveLog(id,selId,inpId){
  const c=contractsData.find(function(x){return x.id===id;});
  if(!c)return;
  selId=selId||'ct-log-status-sel';inpId=inpId||'ct-log-comment-inp';
  const sel=csTrigger(selId);
  const inp=document.getElementById(inpId);
  const to=getCSValue(selId);
  const comment=inp?inp.value.trim():'';
  if(!to){ctFlashField(sel);return;}
  if(!comment){ctFlashField(inp);return;}

  const flow=ctFlowFor(c.type);
  const from=c.status;
  const back=flow.indexOf(to)>=0&&flow.indexOf(from)>=0&&flow.indexOf(to)<flow.indexOf(from);

  /* Three outcomes, and the DIRECTION picks between them - not the button:
     no move is a note, backwards is an override, forwards is the stage event
     the registry holds for the stage being entered. */
  let key,visibility;
  if(to===from){key='COMMENT_ADDED';visibility='INTERNAL';}
  else if(back){key='STATUS_REVERTED';visibility='INTERNAL';}
  else{key=ctEventKeyFor(c.type,to);visibility='CLIENT';}

  c.status=to;
  emitContractEvent(c,key,{prevStatus:from,newStatus:to,comment:comment,visibility:visibility});
  delete window._ctPendingStatus;
  ctStatusModal=null;
  renderADTPage();
  if(to===from)showToast('Comment saved','success','Added to '+c.contractId+'.');
  else if(back)showToast('Contract reverted','info',c.contractId+' moved back to '+to+'.');
  else showToast('Contract updated','success',c.contractId+' &rarr; '+to+'.');
}

function renderCtSidebar(){
  const editBtn='<button class="lp-sb-view-edit-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>';
  const c=contractsData.find(x=>x.id===ctSelectedId);if(!c)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'commercial-terms',label:'Commercial Terms'},{id:'compliance',label:'Compliance'},{id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'ct-isb-tabs\')" title="Scroll left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>'
    +'<div class="lp-isb-tabs" id="ct-isb-tabs">'+tabs.map(t=>'<button class="lp-isb-tab'+(ctTab===t.id?' active':'')+'" onclick="navCtTab(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'ct-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeCtSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const dv='<span style="color:#9ca3af">--</span>';
  const v=(x)=>x&&x!=='--'?x:dv;
  const iGlobe='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const iCheck='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const iUser='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iMail='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  const iPhone='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.2.73.43 1.44.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.9-.87a2 2 0 0 1 2.11-.45c1.37.27 2.08.5 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>';
  const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iBag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>';
  const iTag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const iDoc='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  const iDollar='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
  const iClock='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  const fc=(ico,label,val)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
  let body='';
  if(ctTab==='basic-details'){
    const wpVal=c.workPermit?'Yes':'No';
    if(sbIsEditing('ct',c.id))body=sbHero({icon:sbIco.fileCheck,name:c.empName,meta:['Contract '+c.contractId,c.type,c.country],status:sbHeroBadge(c.status),editing:true})+sbEditFormHTML('ct',c);
    else body=sbHero({icon:sbIco.fileCheck,name:c.empName,meta:['Contract '+c.contractId,c.type,c.country],status:sbHeroBadge(c.status),edit:sbEditBtnFor('ct',c.id)})
      +'<div class="lp-sb-detail-grid">'
      +fc(iGlobe,'Nationality',v(c.nationality))+fc(iGlobe,'Country of Operation',v(c.countryOfOp))
      +fc(iCheck,'Work Permit',wpVal)+fc(iUser,'Name',v(c.empName))
      +fc(iUser,'Gender',v(c.gender))+fc(iMail,'Email ID',v(c.email))
      +fc(iPhone,'Contact Number',v(c.contact))+fc(iCal,'Date of Birth',v(c.dob))
      +fc(iBag,'Job Title',v(c.jobTitle))+fc(iTag,'Skill',v(c.skill))
      +fc(iCal,'Employment Duration',v(c.empDuration))+fc(iTag,'Employment Type',v(c.empType))
      +fc(iClock,'Work Schedule',v(c.workSchedule))+fc(iDollar,'Pay Amount',v(c.payAmount))
      +fc(iDollar,'Currency',v(c.currency))+fc(iDoc,'Job Description',v(c.jobDesc))
      +fc(iClock,'Pay Frequency',v(c.payFrequency))
      +'</div>';
  }else if(ctTab==='commercial-terms'){
    const cm=c.commercial;
    const cf=(l,val)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+l+'</div><div class="lp-sb-field-value">'+(val||dv)+'</div></div></div>';
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Commercial Terms</span>'+editBtn+'</div>'
      +'<div class="lp-sb-detail-grid">'
      +cf('Adt Monthly Management Fee',cm.adtFee)+cf('Annual Gross Salary',cm.annualGross)
      +cf('Base Gross Salary',cm.baseGross)+cf('Holiday Bonus Accrued',cm.holidayBonus)
      +cf('Month 13 Accrued',cm.month13)+cf('Monthly Gross Salary Net',cm.monthlyGrossNet)
      +cf('Monthly Invoice Value',cm.monthlyInvoice)+cf('Monthly Salary 12',cm.monthlySalary12)
      +cf('Monthly Salary 1392',cm.monthlySalary1392)+cf('Net Pay',cm.netPay)
      +cf('Social Premiums Amount',cm.socialPremAmt)+cf('Social Premiums Pct',cm.socialPremPct)
      +cf('Total Monthly Gross Salary',cm.totalMonthlyGross)
      +'</div>';
  }else if(ctTab==='compliance'){
    const upIco='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
    const nC=c.complianceItems.length;
    body='<div class="att-bar"><span class="att-count">'+nC+' item'+(nC===1?'':'s')+'</span></div>'
      +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr>'
      +'<th>Sr. No</th><th>Compliance Item</th><th>Note</th><th>Status</th><th>Documents</th><th class="csag-act">Action</th>'
      +'</tr></thead>'
      +'<tbody>'+(nC?c.complianceItems.map((ci,i)=>'<tr>'
        +'<td class="csag-td csag-num">'+(i+1)+'</td>'
        +'<td class="csag-td"><div class="lp-c-main">'+ci.item+'</div></td>'
        +'<td class="csag-td">'+ci.note+'</td>'
        +'<td class="csag-td">'+ci.status+'</td>'
        +'<td class="csag-td csag-src">Upload your document</td>'
        +'<td class="csag-td csag-act"><button class="att-row-btn" title="Upload">'+upIco+'</button></td>'
        +'</tr>').join('')
        :'<tr><td colspan="6" class="csag-td csag-empty">No compliance items.</td></tr>')
      +'</tbody></table></div>';
  }else if(ctTab==='history'){
    body=sbHistoryHTML(c);
  }else if(ctTab==='logs'){
    body=ctLogsTabHTML(c);
  }else if(ctTab==='workflow'){
    body=wfTimelineHTML(wfContract(c));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
/* ══ EOR/PEO: ONE FORM, TWO TYPES ═══════════════════════════════════════════
   EOR and PEO ask for exactly the same thing - the PRD writes them as
   "EOR/PEO" throughout and gives PEO no field, stage or gate that EOR does not
   have - so they share ONE wizard, one step counter and one set of nav
   functions. The type is a parameter, not a fork: it decides the page id (so
   the AI journey can route to either) and the pill in the header, nothing
   else. Immigration and Contractor do NOT share it; they ask different
   questions and live in contract-intake.js.

   Two step variables used to exist, eorStep and peoStep, which meant the
   stepper had to pick a nav function by string-comparing the type at render
   time and a half-finished EOR draft could be abandoned by switching to PEO
   and back. One variable cannot drift from itself. */
var ctFormStep=0;
var ctFormType='EOR';
/* What has been typed so far. The wizard rebuilds the current step from
   scratch on every repaint, so a step that is navigated away from is gone
   unless it has been read out first - which is what ctFormCapture does, on
   every move in either direction. */
var ctFormData={};
function ctFormOpen(type){ctFormType=type;ctFormStep=0;ctFormData={};page=type==='PEO'?'contract-peo':'contract-eor';renderADTPage();}
/* Nav never re-assigns `page`: it is already contract-eor or contract-peo,
   because these only ever run from inside the form. Assigning it again from a
   remembered type is how a PEO draft ends up on the EOR route. */
function ctFormGoStep(s){ctFormCapture();ctFormStep=s;renderADTPage();}
function ctFormNext(){ctFormCapture();ctFormStep=Math.min(2,ctFormStep+1);if(aiAssistedFlow)aiCtPushStepMessage(ctFormStep);renderADTPage();}
function ctFormBack(){ctFormCapture();if(ctFormStep===0){ctIntakeExit();return;}ctFormStep--;renderADTPage();}
/* Manual and AI-assisted runs fill different buckets - the assistant's bucket
   is also written by the chat - but they read the same DOM, so there is one
   reader and the caller says where it lands. */
function ctFormCapture(){ctFormCaptureInto(aiAssistedFlow?aiWizardFormData:ctFormData);}
function aiCaptureCurrentStep(){
  if(!aiAssistedFlow)return;
  ctFormCaptureInto(aiWizardFormData);
}
function ctFormCaptureInto(into){
  const gv=function(id){const el=document.getElementById(id);return el?el.value:undefined;};
  const merge=function(k,v){if(v!==undefined&&v!=='')into[k]=v;};
  merge('fname',gv('peo-fname'));merge('lname',gv('peo-lname'));merge('gender',gv('peo-gender'));
  merge('email',gv('peo-email'));merge('dial',gv('peo-dial'));merge('mobile',gv('peo-mobile'));merge('dob',gv('peo-dob'));
  merge('address',gv('peo-address'));merge('nationality',gv('peo-nationality'));merge('country',gv('peo-work-country'));
  const wpEl=document.querySelector('.peo-wp-radio.selected span');
  if(wpEl)into.workPermit=wpEl.textContent.indexOf('has work permit')!==-1;
  const vaEl=document.querySelector('.peo-radio-visa.selected span');
  if(vaEl)into.visaAssistance=vaEl.textContent;
  merge('jobTitle',gv('peo-jobtitle'));merge('skill',gv('peo-skill'));merge('jobDesc',gv('peo-jobdesc'));
  merge('fromDate',gv('peo-from'));merge('toDate',gv('peo-to'));merge('hours',gv('peo-hours'));
  merge('currency',gv('peo-currency'));merge('pay',gv('peo-pay'));merge('payFrequency',gv('peo-payfreq'));
  const termEl=document.querySelector('.peo-radio-term.selected span');
  if(termEl)into.employmentTerm=termEl.textContent;
  const typeEl=document.querySelector('.peo-radio-emptype.selected span');
  if(typeEl)into.employeeType=typeEl.textContent;
  merge('leaveAnnual',gv('peo-leave-annual'));merge('leaveSick',gv('peo-leave-sick'));
  merge('leaveMaternity',gv('peo-leave-maternity'));
  merge('leaveNewType',gv('peo-leave-newtype'));merge('leaveNewDays',gv('peo-leave-newdays'));
  merge('probation',gv('peo-prob'));merge('notice',gv('peo-notice'));
}
/* Submitting a manual EOR/PEO run. It commits through the same writer the
   Immigration and Contractor forms use, so all three land a record with the
   same shape, the same first log line and the same landing behaviour. Before
   this, Submit on an EOR wizard navigated to the list and wrote nothing. */
function ctFormSubmit(){
  ctFormCapture();
  const p=ctFormData;
  const type=page==='contract-peo'?'PEO':'EOR';
  const name=((p.fname||'')+' '+(p.lname||'')).trim();
  if(!name){
    ctFormStep=0;renderADTPage();
    showToast('Name is required','error','Add a first and last name before submitting.');
    return;
  }
  /* serviceType has to be one of CT_TYPES[type].svcTypes verbatim, because the
     listing filters on it. Part time wins over the term radio: a part-time
     fixed-term placement is filed as Part time, which is the distinction the
     service list actually draws. */
  const svcType=p.employeeType==='Part Time'?'Part time'
    :p.employmentTerm==='Fixed Term'?'Fixed term':'Permanent';
  /* The intake's own answers become the requirement's checklist, the same way
     they do on the other two types. Visa assistance and an extra leave type
     are both work somebody has to pick up. */
  const docs=[{item:type+' '+(p.country||'')+' Quote',note:'Mandatory',status:'Pending',doc:null}];
  if(p.workPermit!==true)docs.push({item:'Right to work evidence - worker not yet authorised',note:'Mandatory',status:'Pending',doc:null});
  if(p.visaAssistance==='Employee would like ADT to assist')docs.push({item:'Visa assistance requested - refer to Mobility',note:'Mandatory',status:'Pending',doc:null});
  if(p.leaveNewType)docs.push({item:'Additional leave type: '+p.leaveNewType+(p.leaveNewDays?' ('+p.leaveNewDays+' days)':''),note:'Optional',status:'Pending',doc:null});
  ciCommitContract({
    type:type,serviceType:svcType,name:name,
    country:p.country||'—',nationality:p.nationality||p.country||'—',
    workPermit:p.workPermit===true,gender:p.gender,
    email:p.email,contact:((p.dial||'+91')+' '+(p.mobile||'')).trim(),dob:p.dob,
    jobTitle:p.jobTitle,skill:p.skill,jobDesc:p.jobDesc,
    fromDate:p.fromDate,toDate:p.toDate,
    hours:p.hours,pay:p.pay,
    currency:p.currency||'EUR',payFrequency:p.payFrequency||'Monthly',
    complianceItems:docs,
    logLine:'Requirement submitted for review and quotation.',
    workflowLine:type+' requirement for '+name+' submitted for quotation and review.'
  });
}
// ── COMPLIANCE ITEMS PAGE ──
function applyComplianceFilters(){
  complianceCountryFilter=getCSValue('cmp-f-country');
  complianceModelFilter=getCSValue('cmp-f-model');
  complianceStatusFilter=getCSValue('cmp-f-status');
  complianceSearchQuery=lpSearchValue('cmp-f-q');
  renderADTPage();
}
function resetComplianceFilters(){
  complianceCountryFilter='';complianceModelFilter='';complianceStatusFilter='';complianceSearchQuery='';
  renderADTPage();
}
function cmpToggleStatFilter(v){
  complianceStatusFilter=complianceStatusFilter===v?'':v;
  complianceSelectedId=null;
  renderADTPage();
}
function closeComplianceModal(){complianceModalOpen=false;renderADTPage();}
function saveComplianceItem(){
  const nameEl=document.getElementById('cmp-new-name');
  const name=nameEl?nameEl.value.trim():'';
  if(!name)return;
  const model=ciPicked('cmp-new-model','EOR');
  const country=getCustomSelectValue('cmp-new-country')||'Netherlands';
  const category=ciPicked('cmp-new-category','Onboarding');
  const mandatoryEl=document.getElementById('cmp-new-mandatory');
  const blockingEl=document.getElementById('cmp-new-blocking');
  const evidenceEl=document.getElementById('cmp-new-evidence');
  const mandatory=mandatoryEl?mandatoryEl.checked:true;
  const payrollBlocking=blockingEl?blockingEl.checked:false;
  const evidenceRequired=evidenceEl?evidenceEl.checked:false;
  const now=new Date();
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h=now.getHours(),m=now.getMinutes(),s=now.getSeconds();
  const ampm=h>=12?'PM':'AM';h=h%12||12;
  const createdAt=String(now.getDate()).padStart(2,'0')+' '+months[now.getMonth()]+' '+now.getFullYear()+' | '+(h<10?'0'+h:h)+':'+(m<10?'0'+m:m)+':'+(s<10?'0'+s:s)+' '+ampm;
  complianceItemsData.unshift({id:complianceNextId++,country,item:name,model,status:'Active',category,mandatory,payrollBlocking,evidenceRequired,createdBy:'Shaun Mathew',createdAt,attachments:[],logs:[]});
  lpLanded('compliance',complianceItemsData[0].id);
  complianceModalOpen=false;
  renderADTPage();
  showToast('Compliance item created','success','"'+name+'" added for '+country+' ('+model+').');
}
function buildCreateComplianceModalHTML(){
  const xSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create Compliance</span><button class="ct-modal-close" onclick="closeComplianceModal()">'+xSvg+'</button></div>'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Compliance Item Name <span class="req">*</span></label><input type="text" class="ep-form-input" id="cmp-new-name" placeholder="e.g. Right to Work Check"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employment Model <span class="req">*</span></label>'
      +ciRadio('cmp-new-model',['EOR','PEO','Direct'],'EOR')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Country <span class="req">*</span></label>'+customSelect('cmp-new-country','',['Netherlands','Belgium','India','Germany','Spain'],'Select Country')+'</div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Category <span class="req">*</span></label>'
      +ciRadio('cmp-new-category',['Onboarding','Payroll','Offboarding','Statutory'],'Onboarding')+'</div>'
    +'</div>'
    +'<div class="ep-form-card cmp-rules-card">'
    +'<div class="cs-toggle-row"><div><div class="cs-toggle-label">Mandatory</div><div class="cmp-rule-hint">Employees must complete this item</div></div><label class="cs-toggle"><input type="checkbox" id="cmp-new-mandatory" checked><span class="cs-toggle-slider"></span></label></div>'
    +'<div class="cs-toggle-row"><div><div class="cs-toggle-label">Payroll Blocking</div><div class="cmp-rule-hint">Payroll is blocked until this item is resolved</div></div><label class="cs-toggle"><input type="checkbox" id="cmp-new-blocking"><span class="cs-toggle-slider"></span></label></div>'
    +'<div class="cs-toggle-row"><div><div class="cs-toggle-label">Evidence Required</div><div class="cmp-rule-hint">A supporting document must be uploaded</div></div><label class="cs-toggle"><input type="checkbox" id="cmp-new-evidence"><span class="cs-toggle-slider"></span></label></div>'
    +'</div>'
    +'<div style="display:flex;justify-content:flex-end;gap:10px">'
    +'<button class="ep-cancel-btn" onclick="closeComplianceModal()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="saveComplianceItem()">Save</button>'
    +'</div>'
    +'</div></div>';
}
// A detail panel's header: eyebrow, the record's own name, its status and the
// primary action. Replaces the `<span></span>` spacer that panels used to push
// the Edit button right with, which left the rest of the row empty.
/* EVERYTHING THE PANEL KNOWS IS A FIELD.

   These panels used to open with a header band: the record type in small caps,
   the record name as a headline, and the status off to the right. None of the
   three was readable the way the rest of the record is. The type repeated the
   listing you opened the row from; the name was a headline in a place nothing
   else is read from; and the status floated with no label saying what it was
   the status OF. All three are gone from the head - the name and the status are
   now the first two cards in the grid, labelled like every other value.

   What is left above the grid is the Edit button, which is an action and not a
   value, and so is the one thing that does not belong in the grid. Panels with
   no Edit button render nothing here at all. */
function sbActionRow(actionHTML){
  return actionHTML?'<div class="lp-sb-action-row">'+actionHTML+'</div>':'';
}
/* Yes/No is a VALUE, not a status, so it is rendered in the panel's one value
   colour and nothing else. The leave-policy panel used to paint its own pair
   green (#16a34a) and red (#b83a3a) at weight 700, which put three more text
   colours into a card that already had a label grey and a value ink - and,
   worse, spent the status palette on fields that carry no status. Green there
   said "good" about "Carry Forward Allowed: Yes", which is not a judgement the
   panel is entitled to make; it is a setting, and it is simply on.

   ONE COLOURED FIELD PER PANEL, and it is Status - sbStatus() in core.js, on
   the --st-* tokens. Everything else is value ink. */
function lpFlagValue(v){return v?'Yes':'No';}
// '15 Jun 2026 | 01:30:34 PM' reads better split across two fields than crammed
// into one as "Name ( date | time )".
function lpCreatedOn(v){return String(v==null?'':v).replace(' | ',', ');}

// ── COMPLIANCE ITEM DETAIL SIDEBAR ──
function openComplianceSidebar(id){
  if(complianceSelectedId!=null&&String(complianceSelectedId)!==String(id)&&sbLeaveGuard('cmp',function(){openComplianceSidebar(id);}))return;
  complianceTab=sbKeepTab(complianceSelectedId,complianceTab);complianceSelectedId=id;
  const sb=document.getElementById('cmp-split-sb');if(sb)sb.classList.add('open');
  isbTab('cmp',renderComplianceSidebar);   // body-only swap when the panel is already open
  document.querySelectorAll('.cmp-row').forEach(r=>r.classList.toggle('lp-row-selected',r.id==='cmp-row-'+id));
}
function closeComplianceSidebar(){if(sbLeaveGuard('cmp',closeComplianceSidebar))return;sbEditing=null;
  complianceSelectedId=null;
  const sb=document.getElementById('cmp-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.cmp-row').forEach(r=>r.classList.remove('lp-row-selected'));
}
function navComplianceTab(tab){if(!sbHasDraft('cmp'))sbEditing=null;complianceTab=tab;isbTab('cmp',renderComplianceSidebar);}
function complianceCancelLog(){
  const inp=document.getElementById('cmp-log-comment-inp');if(inp)inp.value='';
  csClear('cmp-log-status-sel');
}
function complianceSaveLog(id){
  const item=complianceItemsData.find(x=>x.id===id);if(!item)return;
  const was=item.status;
  if(!lpCommitLog(item,'cmp-log-status-sel','cmp-log-comment-inp',complianceLogsData[item.id]))return;
  renderADTPage();
  showToast('Log added','success',item.status!==was
    ? '"'+item.item+'" moved to '+item.status+'.'
    : 'Comment saved to "'+item.item+'".');
}
function renderComplianceSidebar(){
  const editBtn='<button class="lp-sb-view-edit-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>';
  const item=complianceItemsData.find(x=>x.id===complianceSelectedId);if(!item)return'';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'attachments',label:'Attachments'},{id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<div class="lp-isb-tabs" id="cmp-isb-tabs">'+tabs.map(t=>'<button class="lp-isb-tab'+(complianceTab===t.id?' active':'')+'" onclick="navComplianceTab(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'cmp-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeComplianceSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const iUser='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iGlobe='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const iDoc='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  const iTag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const iCheck='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const fc=(ico,label,val)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
  let body='';
  if(complianceTab==='basic-details'){
    const iLock='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    const iClip='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.49a3 3 0 0 1 4.24 4.24l-8.49 8.49a1 1 0 0 1-1.41-1.41l7.78-7.78"/></svg>';
    // Country / model / category / the three rules / who and when — eight fields
    // that fill the two-column grid evenly. The name leads the grid as a full-width
    // field, and the three rule flags the create form collects are shown here too.
    if(sbIsEditing('cmp',item.id))body=sbHero({icon:sbIco.shieldCheck,name:item.item,meta:[item.country,item.model,item.category],status:sbHeroBadge(item.status),editing:true})+sbEditFormHTML('cmp',item);
    else body=sbHero({icon:sbIco.shieldCheck,name:item.item,meta:[item.country,item.model,item.category],status:sbHeroBadge(item.status),edit:sbEditBtnFor('cmp',item.id)})
      +'<div class="lp-sb-detail-grid">'
      +fc(iClip,'Requirement',item.item)+fc(iCheck,'Status',sbStatus(item.status))
      +fc(iGlobe,'Country',item.country)+fc(iDoc,'Employment Model',item.model)
      +fc(iTag,'Category',item.category)+fc(iCheck,'Mandatory',lpFlagValue(item.mandatory))
      +fc(iLock,'Payroll Blocking',lpFlagValue(item.payrollBlocking))+fc(iClip,'Evidence Required',lpFlagValue(item.evidenceRequired))
      +fc(iUser,'Created By',item.createdBy)+fc(iCal,'Created On',lpCreatedOn(item.createdAt))
      +'</div>';
  }else if(complianceTab==='attachments'){
    body=attachTabHTML('cmp',complianceSelectedId);
  }else if(complianceTab==='history'){
    body=sbHistoryHTML(item);
  }else if(complianceTab==='logs'){
    const logs=seedLogs(item,complianceLogsData[item.id]);
    const logStatusKey=(s)=>({Active:'active',Inactive:'inactive'}[s]||'default');
    const csk=logStatusKey(item.status);
    const formHTML='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+csk+'"></span>'+item.status+'</div>'
      +'<p class="lp-logs-form-sub">Update requirement status and add a comment</p>'
      +lpLogStatusField('cmp-log-status-sel',item.status,['Active','Inactive'])
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="cmp-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="ep-cancel-btn" style="flex:1" onclick="complianceCancelLog()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="complianceSaveLog('+item.id+')">Submit</button>'
      +'</div>'
      +'</div>';
    body=lpLogsView(logs,formHTML);
  }else if(complianceTab==='workflow'){
    body=wfTimelineHTML(wfApproval(item,wfDoneFromLogs(seedLogs(item,complianceLogsData[item.id])),'Compliance Admin'));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function buildComplianceItemsHTML(){
  const countryOpts=['Netherlands','Belgium','India','Germany','Spain'];
  const modelOpts=['EOR','PEO','Direct'];
  const statusOpts=['Active','Inactive'];
  let rows=complianceItemsData;
  if(complianceCountryFilter)rows=rows.filter(r=>r.country===complianceCountryFilter);
  if(complianceModelFilter)rows=rows.filter(r=>r.model===complianceModelFilter);
  if(complianceStatusFilter)rows=rows.filter(r=>r.status===complianceStatusFilter);
  if(complianceSelectedId&&!rows.some(r=>r.id===complianceSelectedId))complianceSelectedId=null;
  const totalActive=complianceItemsData.filter(r=>r.status==='Active').length;
  const totalInactive=complianceItemsData.filter(r=>r.status==='Inactive').length;
  const hamburgerIco='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const pgn=listPage('compliance',[complianceCountryFilter,complianceModelFilter,complianceStatusFilter,complianceSearchQuery].join('|'),rows.map((r,i)=>'<tr class="cmp-row'+(complianceSelectedId===r.id?' lp-row-selected':'')+'" id="cmp-row-'+r.id+'" style="cursor:pointer" onclick="openComplianceSidebar('+r.id+')">'
    +'<td style="color:var(--gray);font-size:13px">'+(i+1)+'</td>'
    +'<td style="font-weight:600;color:var(--navy)">'+r.country+'</td>'
    +'<td><span style="color:var(--orange);font-weight:500">'+r.item+'</span></td>'
    +'<td>'+r.model+'</td>'
    +'<td><span class="lp-status-badge '+r.status.toLowerCase()+'">'+r.status+'</span></td>'
    +'<td onclick="event.stopPropagation()">'+rowLogCell('compliance',r.id)+'</td>'
    +'</tr>'),
    '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--gray)">No records match this filter.</td></tr>');
  const sbInner=complianceSelectedId?renderComplianceSidebar():'';
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div class="at-top">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('cmp-f-q',complianceSearchQuery,'Search item','applyComplianceFilters()')
    +apCS('cmp-f-country',countryOpts,complianceCountryFilter,'Country')
    +apCS('cmp-f-model',modelOpts,complianceModelFilter,'Model')
    +apCS('cmp-f-status',statusOpts,complianceStatusFilter,'Status')
    +clearFiltersBtn([complianceCountryFilter,complianceModelFilter,complianceStatusFilter,complianceSearchQuery],'resetComplianceFilters()')
    +'<button class="lp-pill-search" onclick="applyComplianceFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats" style="flex-shrink:0">'
    +'<div class="listing-stat active'+(complianceStatusFilter==='Active'?' stat-selected':'')+'" onclick="cmpToggleStatFilter(\'Active\')"><div class="listing-stat-count">'+totalActive+'</div><div class="listing-stat-label">Active</div></div>'
    +'<div class="listing-stat inactive'+(complianceStatusFilter==='Inactive'?' stat-selected':'')+'" onclick="cmpToggleStatFilter(\'Inactive\')"><div class="listing-stat-count">'+totalInactive+'</div><div class="listing-stat-label">Inactive</div></div>'
    +'</div>'
    +'</div>'
    +'<div class="lp-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr>'
    +'<th>S. NO</th><th>COUNTRY</th><th>COMPLIANCE ITEM</th><th>EMPLOYMENT MODEL</th><th>STATUS</th><th>ACTION</th>'
    +'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(complianceSelectedId?' open':'')+'" id="cmp-split-sb"><div class="lp-isb" id="cmp-isb-inner">'+sbInner+'</div></div>'
    +'</div>'
    +(complianceModalOpen?buildCreateComplianceModalHTML():'');
}

// ══ OPENDHI COMPLIANCE ADMIN DASHBOARD ═══════════════════════════════════
// Header, a strip of count tiles that double as the filter, and one paged
// listing. Every number is derived from ocaItems, so a tile can never disagree
// with the rows it filters to.
// Status colours come from the shared statusTone() map, same as every other
// listing, so the pills here read exactly like the pills everywhere else.
// What the admin has to do, taken from the status rather than written per row —
// six honest phrasings beat 48 invented ones. Each one names the actual next
// move, not a restatement of the status.
const OCA_NEXT={
  'Pending Review': 'Read the document and approve or reject it',
  'Awaiting Upload':'Upload it, or chase whoever owes it',
  'Rejected':       'Chase the corrected copy and re-review',
  'Expiring Soon':  'Start the renewal before validity lapses',
  'Approved':       'Nothing pending',
  'Closed':         'Nothing pending'
};
function ocaRef(r){return 'CMP-'+(4000+r.id);}

/* ── Line-item history ────────────────────────────────────────────────────
   The panel opened on a row could say what its status IS and nothing about
   how it got there: the Logs tab seeded from an empty array so it always read
   "No activity logs yet", and there was no Workflow tab at all - the only two
   listings in the app without one.

   Both are DERIVED from the item rather than written out 48 times. Hand-typed
   fixtures for 48 rows would disagree with the rows the first time a status
   changed in Logs, and a history that ends on a different status than the
   record is showing is worse than no history. Derived, they cannot drift:
   every entry is built from the item's own category, owner, priority, status
   and due date, and the newest one always states the status the row is in.
   Seeded once per item, then appended to - so a move made in Logs during the
   session stays on the timeline. */
const ocaWorkflowData={};
const OCA_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const OCA_STAGE={
  'Pending Review': {title:'Submitted for Review',  desc:'Document uploaded and queued for the compliance admin to approve or reject.'},
  'Awaiting Upload':{title:'Document Requested',    desc:'Required document has been requested. Nothing has been provided yet.'},
  'Rejected':       {title:'Document Rejected',     desc:'Reviewed and refused. A corrected copy is required before this can clear.'},
  'Expiring Soon':  {title:'Renewal Due',           desc:'Document is in force but its validity lapses within 30 days. Renewal needs to start.'},
  'Approved':       {title:'Document Approved',     desc:'Reviewed, accepted and filed. The document is in force.'},
  'Closed':         {title:'Document Closed',       desc:'No longer in force — lapsed, superseded or withdrawn. Nothing further pending.'}
};
// "22 May" / "Today" is all a row carries, so the timeline dates are worked
// back from that one anchor rather than invented per entry.
function ocaDueObj(r){
  if(r.due==='Today')return new Date();
  const p=String(r.due).split(' '),d=parseInt(p[0],10),m=OCA_MONTHS.indexOf(p[1]);
  return (d&&m>=0)?new Date(2026,m,d):new Date();
}
function ocaFmtDate(dt){return dt.getDate()+' '+OCA_MONTHS[dt.getMonth()]+' '+dt.getFullYear();}
function ocaBackDate(dt,days){const d=new Date(dt.getTime());d.setDate(d.getDate()-days);return ocaFmtDate(d);}
function ocaWorkflow(r){
  if(!ocaWorkflowData[r.id]){
    const due=ocaDueObj(r);
    const cat=ocaCat(r.cat);
    const stage=OCA_STAGE[r.status]||OCA_STAGE['Pending Review'];
    // A document that never arrived has no upload entry to show, so the middle
    // step states the request instead of inventing a delivery that did not happen.
    const middle=r.status==='Awaiting Upload'
      ?{title:'Upload Requested',user:'System',date:ocaBackDate(due,8),time:'11:30:00 AM',
        description:cat.source+' asked to provide "'+r.doc+'" by '+r.due+'.'}
      :{title:'Document Uploaded',user:cat.source,date:ocaBackDate(due,8),time:'11:30:00 AM',
        description:'"'+r.doc+'" uploaded by '+cat.source.toLowerCase()+' and routed to the compliance admin for review.'};
    ocaWorkflowData[r.id]=[   // newest first, same order every other Workflow tab uses
      {title:stage.title,user:CURRENT_USER,date:ocaBackDate(due,1),time:'04:15:00 PM',description:stage.desc},
      middle,
      {title:'Document Required',user:'System',date:ocaBackDate(due,9),time:'09:00:00 AM',
       description:cat.label+' requirement raised for '+r.who+' ('+ocaRef(r)+').'}
    ];
  }
  return ocaWorkflowData[r.id];
}
/* ── What has NOT happened yet ─────────────────────────────────────────────
   The Logs timeline only ever showed steps already taken, so a document sat
   there with no statement of what it is waiting for — the reader had to infer
   the pending move from the newest entry's status. It now opens with the step
   that is still outstanding, drawn as pending: dashed, muted, no author and no
   timestamp, because none of those exist yet. It is a statement, not a control.

   A settled document has nothing outstanding, and says exactly that rather
   than dressing up "done" as a step. */
const OCA_NEXT_STEP={
  'Pending Review': 'Your decision',
  'Awaiting Upload':'Upload',
  'Rejected':       'Corrected copy',
  'Expiring Soon':  'Renewal',
  'Approved':       'Nothing pending',
  'Closed':         'Nothing pending'
};
// Settled records say WHY nothing is pending — OCA_NEXT only has "Nothing
// pending" for these two, which the title has already said.
const OCA_NEXT_DONE={
  'Approved':'Reviewed, accepted and in force. Nothing further is required.',
  'Closed':  'Out of force — lapsed, superseded or withdrawn. Nothing further is required.'
};
function ocaSeedLogs(r){
  const due=ocaDueObj(r);
  return seedLogs(r,[
    {date:ocaBackDate(due,1),time:'04:15:00 PM',user:CURRENT_USER,status:r.status,action:(OCA_STAGE[r.status]||OCA_STAGE['Pending Review']).desc},
    {date:ocaBackDate(due,8),time:'11:30:00 AM',user:'System',status:'Awaiting Upload',
     action:'"'+r.doc+'" listed as a required document for '+r.who+' and assigned to compliance.'}
  ]);
}

function ocaSetFilter(key){
  ocaStatusFilter=ocaStatusFilter===key?'':key;   // clicking the active tile clears it
  ocaPage=1;ocaSelectedId=null;
  renderOcaDashboard();
}
function ocaGoPage(n){
  ocaPage=Math.min(Math.max(1,n),ocaPageCount());
  renderOcaDashboard();
}
// The sub-line answers the two questions this role opens the screen with —
// how much is still live, and how much of it is already on fire.
function buildOcaHeaderHTML(){
  const total=ocaItems.length;
  const need=ocaItems.filter(ocaNeedsAction).length;
  const review=ocaStatusCount('Pending Review');
  const expiring=ocaStatusCount('Expiring Soon');
  return '<div class="oca-head">'
    +'<div class="oca-head-id">'
    +'<div class="oca-head-title">Opendhi Compliance Admin<span class="oca-role">COMPLIANCE ADMIN</span></div>'
    +'<div class="oca-head-sub">You are looking after '+total+' compliance documents — '+need+' still need action, '
    +review+' are waiting on your review and '+expiring+' expire within 30 days.</div>'
    +'</div>'
    +'</div>';
}
// The tiles are the filter — the whole filter. One row of counts, one axis,
// ordered the way the day runs: clear the blockers, start what is yours, finish
// what you are holding, chase what someone else is holding, then what is done.
// Numbers stay in the same navy as every other figure on the dashboard; the
// status pills in the rows below are where colour does its work.
function buildOcaTilesHTML(){
  return '<div class="oca-tiles">'+ocaStatuses.map(function(s){
    const n=ocaStatusCount(s.key);
    const on=ocaStatusFilter===s.key;
    return '<button class="oca-tile'+(on?' is-on':'')+(n?'':' is-zero')+'"'
      +' onclick="ocaSetFilter(\''+attrSafe(s.key)+'\')"'
      +' title="'+attrSafe(on?'Clear this filter':s.note)+'">'
      +'<span class="oca-tile-n">'+n+'</span>'
      +'<span class="oca-tile-l">'+s.key+'</span>'
      +'</button>';
  }).join('')+'</div>';
}
// ── Item detail sidebar ───────────────────────────────────────────────────
// The same split panel every listing page uses: the row's action button opens
// it, the row stays highlighted while it is open, and it closes from its own
// tab bar. A status changed in Logs writes back to the ocaItems row, so the
// tiles, the row and the "what to do next" column all move together.
/* ── What you can do FROM here ─────────────────────────────────────────────
   The Logs form used to offer all six statuses on every document, which is six
   answers to a question that only ever has two or three. Worse, most of them
   were nonsense: a document nobody has uploaded yet cannot be "Approved", and
   an approved one cannot go back to "Pending Review" without a fresh upload.

   So the dropdown is now the legal moves from the status the document is in,
   and nothing else — the same set the Approve/Reject bar offers, just with the
   comment the bar cannot collect. The current status stays at the top of the
   list so a note that moves nothing is still possible; picking it writes a log
   entry and leaves the row where it is. */
const OCA_MOVES={
  'Pending Review': ['Approved','Rejected'],                    // the decision
  'Awaiting Upload':['Pending Review','Closed'],                // it arrives, or it is dropped
  'Rejected':       ['Pending Review','Closed'],                // corrected copy, or withdrawn
  'Expiring Soon':  ['Approved','Awaiting Upload','Closed'],    // renewed, renewal started, or let go
  'Approved':       ['Expiring Soon','Closed'],                 // nearing expiry, or out of force
  'Closed':         ['Awaiting Upload']                         // required again
};
// The question the form is really asking, per status.
const OCA_MOVE_PROMPT={
  'Pending Review': 'Approve this document, or reject it with a reason',
  'Awaiting Upload':'Send it for review once it arrives, or close the requirement',
  'Rejected':       'Send it back for review when the corrected copy arrives',
  'Expiring Soon':  'File the renewed copy, start the renewal, or let it close',
  'Approved':       'Flag it for renewal, or close it once it is out of force',
  'Closed':         'Re-open the requirement if this document is needed again'
};
function ocaMoveOptions(item){
  return [item.status].concat(OCA_MOVES[item.status]||[]);
}
const OCA_STATUSES=OCA_STATUS_KEYS;
function openOcaSidebar(id){
  ocaTab=sbKeepTab(ocaSelectedId,ocaTab);ocaSelectedId=id;
  const sb=document.getElementById('oca-split-sb');if(sb)sb.classList.add('open');
  // a short page must not leave the panel hanging out of the card
  const wrap=document.getElementById('oca-split-wrap');if(wrap)wrap.classList.add('has-sb');
  isbTab('oca',renderOcaSidebar);   // body-only swap when the panel is already open
  document.querySelectorAll('.oca-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='oca-row-'+id);});
}
function closeOcaSidebar(){
  ocaSelectedId=null;
  const sb=document.getElementById('oca-split-sb');if(sb)sb.classList.remove('open');
  const wrap=document.getElementById('oca-split-wrap');if(wrap)wrap.classList.remove('has-sb');
  document.querySelectorAll('.oca-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navOcaTab(tab){ocaTab=tab;isbTab('oca',renderOcaSidebar);}
function ocaCancelLog(){
  const inp=document.getElementById('oca-log-comment-inp');if(inp)inp.value='';
  isbTab('oca',renderOcaSidebar);
}

/* ── The decision bar ──────────────────────────────────────────────────────
   Reviewing a document is this role's actual job, so it is a button on the
   panel, not a status buried in a dropdown on a second tab.

   NO DECISION COMMITS ON THE CLICK. Approve used to move the document the
   instant it was pressed and write itself a canned log line — "Reviewed and
   approved by the compliance admin" — which is not a review note, it is the
   button describing itself. A compliance record whose entire history is the
   system paraphrasing its own buttons cannot answer the one question anyone
   ever asks of it later: on what basis was this accepted?

   So every button that MOVES a document now opens the decision dialog, and the
   dialog will not commit without a comment. The admin's own words become the
   log entry and the workflow stage. Approve and Reject are the same shape as
   each other now — the asymmetry that sent Reject to the Logs tab and let
   Approve through unchallenged is gone.

   Actions that move nothing — Send Reminder, Chase Corrected Copy — still go
   straight through. There is no decision to justify: the document has not
   moved, and the log says so. */
/* One entry per button that moves a document. Each names the move, the words
   it needs, and what the button on the dialog says — so the four decisions
   read as four different acts rather than one generic "change status" form.
   `to` is the status the record lands on; the dialog refuses to open on a move
   the document cannot legally make, which keeps this table and OCA_MOVES from
   ever drifting apart. */
const OCA_DECIDE={
  approve:{to:'Approved',   title:'Approve document', verb:'Approve', tone:'ok',
    ask:'This puts the document in force. Say what you checked.',
    label:'Approval note',
    ph:'e.g. Signatures and company number verified against the registry copy'},
  reject: {to:'Rejected',   title:'Reject document',  verb:'Reject',  tone:'bad',
    ask:'Say what is wrong with it — the {who} will see this reason and has to act on it.',
    label:'Reason for rejection',
    ph:'e.g. Page 2 is illegible — re-upload a clear scan of the full page'},
  renew:  {to:'Awaiting Upload',title:'Start renewal',verb:'Start renewal',tone:'idle',
    ask:'This asks the {who} for a fresh copy before the current one lapses.',
    label:'Renewal note',
    ph:'e.g. Expires 12 Sep — renewal requested from the client'},
  file:   {to:'Approved',   title:'Upload & file',    verb:'Upload & file', tone:'ok',
    ask:'You own this one outright, so filing it puts it straight in force.',
    label:'Filing note',
    ph:'e.g. Filed from the portal acknowledgement dated 24 Aug'}
};
/* The dialog is one record and one move, held only while it is on screen. */
let ocaDecision=null;   // {id, act}
function ocaDecideCopy(act,item){
  const d=OCA_DECIDE[act];
  return d?{to:d.to,title:d.title,verb:d.verb,tone:d.tone,label:d.label,ph:d.ph,
    ask:d.ask.replace('{who}',ocaCat(item.cat).source.toLowerCase())}:null;
}
function openOcaDecision(id,act){
  const item=ocaItems.find(function(x){return x.id===id;});if(!item)return;
  const c=ocaDecideCopy(act,item);if(!c)return;
  closeOcaDecision();
  ocaDecision={id:id,act:act};
  const host=document.createElement('div');
  host.id='oca-dec-host';
  host.innerHTML=ocaDecisionHTML(item,c);
  document.body.appendChild(host);
  document.addEventListener('keydown',ocaDecisionKey);
  const ta=document.getElementById('oca-dec-inp');if(ta)ta.focus();
}
function closeOcaDecision(){
  const host=document.getElementById('oca-dec-host');
  if(host)host.remove();
  ocaDecision=null;
  document.removeEventListener('keydown',ocaDecisionKey);
}
// Escape belongs to whatever is on top: with the document open over the dialog,
// it closes the document and leaves the half-typed decision where it was.
function ocaDecisionKey(e){
  if(e.key!=='Escape')return;
  if(document.getElementById('oca-doc-host'))return;
  ocaDecisionDismiss();
}
/* A stray click on the backdrop must not throw away a reason someone has
   already typed — that is a round trip they have to make again from memory.
   Empty, it closes like any other modal; part-written, it stays put. */
function ocaDecisionDismiss(){
  const ta=document.getElementById('oca-dec-inp');
  if(ta&&ta.value.trim()){
    ta.focus();
    return;
  }
  closeOcaDecision();
}
function ocaDecisionHTML(item,c){
  const arrow='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  const moved=c.to!==item.status;
  return '<div class="oca-dec-ov" onclick="ocaDecisionDismiss()">'
    +'<div class="oca-dec" role="dialog" aria-modal="true" onclick="event.stopPropagation()">'
    +'<div class="oca-dec-hd">'
    +'<div><div class="oca-dec-title">'+c.title+'</div>'
    +'<div class="oca-dec-sub">'+c.ask+'</div></div>'
    +'<button class="oca-doc-close" onclick="ocaDecisionDismiss()" title="Cancel">'+OCA_ICO.x+'</button>'
    +'</div>'
    +'<div class="oca-dec-body">'
    // The file the decision is about, with its own way in - so "read it first"
    // is one click from the dialog rather than a trip back to the panel.
    +ocaDocStripHTML(item)
    +(moved?'<div class="oca-dec-move">'
      +'<span class="lp-status-badge tone-'+statusTone(item.status)+'">'+item.status+'</span>'
      +'<span class="oca-dec-arrow">'+arrow+'</span>'
      +'<span class="lp-status-badge tone-'+statusTone(c.to)+'">'+c.to+'</span>'
      +'</div>':'')
    +'<div class="oca-dec-label">'+c.label+' <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="oca-dec-ta" id="oca-dec-inp" placeholder="'+attrSafe(c.ph)+'" oninput="ocaDecisionTyped()"></textarea>'
    +'<div class="oca-dec-err" id="oca-dec-err">This goes on the document\'s record, so it cannot be left empty.</div>'
    +'</div>'
    +'<div class="oca-dec-ft">'
    +'<button class="oca-act" onclick="closeOcaDecision()">Cancel</button>'
    +'<button class="oca-act oca-dec-go tone-'+c.tone+'" onclick="ocaDecisionCommit()">'+c.verb+'</button>'
    +'</div>'
    +'</div></div>';
}
// The error is raised by trying to commit, and cleared by doing something about
// it - it never sits there scolding someone who is already typing.
function ocaDecisionTyped(){
  const err=document.getElementById('oca-dec-err');
  const ta=document.getElementById('oca-dec-inp');
  if(err&&ta&&ta.value.trim()){err.classList.remove('is-on');ta.classList.remove('is-bad');}
}
function ocaDecisionCommit(){
  if(!ocaDecision)return;
  const item=ocaItems.find(function(x){return x.id===ocaDecision.id;});if(!item)return;
  const c=ocaDecideCopy(ocaDecision.act,item);if(!c)return;
  const ta=document.getElementById('oca-dec-inp');
  const comment=ta?ta.value.trim():'';
  if(!comment){
    const err=document.getElementById('oca-dec-err');
    if(err)err.classList.add('is-on');
    if(ta){ta.classList.add('is-bad');ta.focus();}
    return;
  }
  const id=item.id,to=c.to;
  closeOcaDecision();
  // The admin's own words ARE the log entry. ocaMove does the rest - the status
  // move, the workflow stage, the redraw and the toast - so the dialog adds a
  // step to the decision without adding a second way of recording it.
  ocaMove(id,to,comment);
}

function ocaMove(id,to,line){
  const item=ocaItems.find(function(x){return x.id===id;});if(!item)return;
  const was=item.status;
  ocaSeedLogs(item);ocaWorkflow(item);   // seed first, or the fixtures land on top
  const now=stampNow();
  item.logs.unshift({date:now.date,time:now.time,user:CURRENT_USER,status:to,action:line});
  item.status=to;
  wfPush(ocaWorkflowData,id,(OCA_STAGE[to]||OCA_STAGE['Pending Review']).title,line);
  renderOcaDashboard();
  showToast(to==='Approved'?'Document approved':'Document updated','success',
    '"'+item.doc+'" moved from '+was+' to '+to+'.');
}
// All four go through the dialog, which is where the comment is collected and
// where the move is committed from. Nothing here decides anything by itself.
function ocaApprove(id){openOcaDecision(id,'approve');}
function ocaReject(id){openOcaDecision(id,'reject');}
function ocaRenew(id){openOcaDecision(id,'renew');}
// The admin owns the country pack outright, so filing it is one move: there is
// no third party to review it back to them. It still has to be justified.
function ocaFile(id){openOcaDecision(id,'file');}
// A chase is not a state change — it goes on the log and leaves the row where
// it is, because nothing about the document has actually moved.
function ocaRemind(id){
  const item=ocaItems.find(function(x){return x.id===id;});if(!item)return;
  const who=ocaCat(item.cat).source.toLowerCase();
  ocaSeedLogs(item);
  const now=stampNow();
  item.logs.unshift({date:now.date,time:now.time,user:CURRENT_USER,status:item.status,
    action:'Reminder sent to the '+who+' for "'+item.doc+'". Status unchanged.'});
  isbTab('oca',renderOcaSidebar);
  showToast('Reminder sent','success','The '+who+' was reminded about "'+item.doc+'".');
}
// One row of buttons, driven off the status, so the panel never offers a move
// the document cannot make.
function ocaActionsHTML(item){
  const id=item.id;
  const src=ocaCat(item.cat).source;
  let btns='';
  if(item.status==='Pending Review'){
    btns='<button class="oca-act oca-act-reject" onclick="ocaReject('+id+')">Reject</button>'
        +'<button class="oca-act oca-act-approve" onclick="ocaApprove('+id+')">Approve</button>';
  }else if(item.status==='Awaiting Upload'){
    btns=src==='Compliance Admin'
      ?'<button class="oca-act oca-act-approve" onclick="ocaFile('+id+')">Upload &amp; File</button>'
      :'<button class="oca-act" onclick="ocaRemind('+id+')">Send Reminder</button>';
  }else if(item.status==='Rejected'){
    btns='<button class="oca-act" onclick="ocaRemind('+id+')">Chase Corrected Copy</button>';
  }else if(item.status==='Expiring Soon'){
    btns='<button class="oca-act oca-act-approve" onclick="ocaRenew('+id+')">Start Renewal</button>';
  }else{
    return '';   // Approved and Closed are settled — nothing to offer
  }
  return '<div class="oca-actbar"><span class="oca-actbar-q">'+(OCA_NEXT[item.status]||'')+'</span>'
    +'<div class="oca-actbar-btns">'+btns+'</div></div>';
}
/* == DOCUMENT PREVIEW =====================================================
   The panel asked the admin to "read the document and approve or reject it"
   and then never showed them the document. Approve and Reject were the only
   two controls on a screen that described a file it would not open - which is
   not a review, it is a coin toss with an audit trail.

   So every place that names the document now opens it: the row, the Document
   field, the strip above the decision bar, and the log entries that record the
   document actually changing hands. One viewer serves all of them.

   It mounts on <body>, not inside the panel. The panel is rebuilt by
   renderOcaDashboard() on every status move, and a viewer living inside it
   would be destroyed mid-decision - including by the very Approve click taken
   from its own footer. On body it outlives the redraw and closes on its own
   terms: the X, the backdrop, or Escape.

   There is no file store behind this prototype, so the pages are RENDERED
   from the record - same derivation as ocaFileMeta(), so what the viewer shows
   and what the strip claims can never disagree. */
let ocaDocOpenId=null,ocaDocZoom=1;
const OCA_DOC_MIN=.7,OCA_DOC_MAX=1.6;

// Icons kept together: the viewer, the strip and the row buttons all draw from
// this one set, so a document reads the same everywhere it is offered.
const OCA_ICO={
  eye:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  file:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  img:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  dl:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  x:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};
function ocaFileIco(item){return ocaFileKind(item)==='JPG'?OCA_ICO.img:OCA_ICO.file;}

/* -- The pages ------------------------------------------------------------
   Enough of a document to be reviewed like one: a letterhead that names who
   issued it, the reference the row is filed under, the dates the record holds,
   and a body. The body's opening lines are real sentences built from the
   record; the dense fine print under them is set as rules rather than invented
   legalese, because a prototype that puts fabricated contract clauses in front
   of a compliance admin is worse than one that visibly abstracts them. */
function ocaDocIssuer(item){
  if(item.cat==='country')return item.who+' - Statutory Authority';
  return item.who;
}
function ocaDocLines(n,seed){
  let out='';
  for(let i=0;i<n;i++){
    const w=58+((seed+i*29)%40);   // 58-97% - stable per page, so it never reflows
    out+='<div class="oca-doc-rule" style="width:'+w+'%"></div>';
  }
  return '<div class="oca-doc-rules">'+out+'</div>';
}
function ocaDocMetaRow(k,v){
  return '<div class="oca-doc-mrow"><span class="oca-doc-mk">'+k+'</span><span class="oca-doc-mv">'+v+'</span></div>';
}
// A scan of an ID is not a page of prose, so it is not drawn as one.
function ocaDocScanHTML(item){
  return '<div class="oca-doc-scan">'
    +'<div class="oca-doc-scan-hd"><span>'+item.doc+'</span><span>'+ocaRef(item)+'</span></div>'
    +'<div class="oca-doc-scan-body">'
    +'<div class="oca-doc-scan-photo">'+OCA_ICO.img+'<span>PHOTO</span></div>'
    +'<div class="oca-doc-scan-fields">'
    +ocaDocMetaRow('Holder',item.who)
    +ocaDocMetaRow('Document',item.doc)
    +ocaDocMetaRow('Issued by',ocaCat(item.cat).source)
    +ocaDocMetaRow(ocaDateLabel(item),ocaDateValue(item))
    +'</div></div>'
    +'<div class="oca-doc-scan-mrz">'+ocaDocLines(2,7)+'</div>'
    +'</div>';
}
function ocaDocPageHTML(item,n,total){
  const cat=ocaCat(item.cat);
  // A single-page document has nothing to count, so it is not numbered.
  const foot=total>1?'<div class="oca-doc-pg-no">Page '+n+' of '+total+'</div>':'';
  if(ocaFileKind(item)==='JPG')
    return '<section class="oca-doc-page is-scan" data-pg="'+n+'">'+ocaDocScanHTML(item)+foot+'</section>';
  let body='';
  if(n===1){
    body='<div class="oca-doc-lh">'
      +'<div class="oca-doc-lh-org">'+ocaDocIssuer(item)+'</div>'
      +'<div class="oca-doc-lh-kind">'+cat.label+'</div>'
      +'</div>'
      +'<h1 class="oca-doc-h1">'+item.doc+'</h1>'
      +'<div class="oca-doc-meta">'
      +ocaDocMetaRow('Reference',ocaRef(item))
      +ocaDocMetaRow('Employee / Client',item.who)
      +ocaDocMetaRow('Submitted by',cat.source)
      +ocaDocMetaRow(ocaDateLabel(item),ocaDateValue(item))
      +'</div>'
      +'<p class="oca-doc-p">This document has been provided by the '+cat.source.toLowerCase()
      +' in respect of <strong>'+item.who+'</strong> and is filed against reference '
      +ocaRef(item)+'.</p>'
      +'<p class="oca-doc-p">The pages that follow set out the particulars, the terms they are given '
      +'under and the signatures relied on. Read them in full before recording a decision - what is '
      +'written on the Logs tab is the record of this review.</p>'
      +ocaDocLines(7,item.id);
  }else if(n===total){
    body='<h2 class="oca-doc-h2">Execution</h2>'
      +ocaDocLines(4,item.id+n)
      +'<div class="oca-doc-sign">'
      +'<div class="oca-doc-sign-col"><div class="oca-doc-sign-rule"></div>'
      +'<div class="oca-doc-sign-k">For and on behalf of</div>'
      +'<div class="oca-doc-sign-v">'+item.who+'</div></div>'
      +'<div class="oca-doc-sign-col"><div class="oca-doc-sign-rule"></div>'
      +'<div class="oca-doc-sign-k">Received by</div>'
      +'<div class="oca-doc-sign-v">Opendhi Compliance</div></div>'
      +'</div>';
  }else{
    body='<h2 class="oca-doc-h2">Annexure '+(n-1)+'</h2>'+ocaDocLines(12,item.id+n*3);
  }
  return '<section class="oca-doc-page" data-pg="'+n+'">'+body+foot+'</section>';
}

/* -- The viewer -----------------------------------------------------------
   The footer carries the same two decisions the panel offers, and calls the
   same two functions - ocaApprove() and ocaReject() - rather than repeating
   what they do. Approve commits; Reject hands off to the Logs form for the
   reason, exactly as it does from the panel, so a document still cannot be
   refused without one. Anything already settled gets no decision footer:
   there is nothing to decide, and the viewer is then simply a reader. */
function ocaDocViewerHTML(item){
  const f=ocaFileMeta(item);
  const pending=item.status==='Pending Review';
  let pages='';
  for(let i=1;i<=f.pages;i++)pages+=ocaDocPageHTML(item,i,f.pages);
  const foot=pending
    ?'<button class="oca-act oca-act-reject" onclick="ocaDocReject('+item.id+')">Reject</button>'
     +'<button class="oca-act oca-act-approve" onclick="ocaDocApprove('+item.id+')">Approve</button>'
    :'<button class="oca-act" onclick="closeOcaDocPreview()">Close</button>';
  return '<div class="oca-doc-ov" onclick="closeOcaDocPreview()">'
    +'<div class="oca-doc-modal" role="dialog" aria-modal="true" aria-label="Document preview" onclick="event.stopPropagation()">'
    +'<div class="oca-doc-hd">'
    +'<div class="oca-doc-hd-ico">'+ocaFileIco(item)+'</div>'
    +'<div class="oca-doc-hd-txt">'
    +'<div class="oca-doc-hd-name" title="'+attrSafe(f.name)+'">'+f.name+'</div>'
    +'<div class="oca-doc-hd-sub">'+item.who+' &middot; '+ocaRef(item)+' &middot; '+ocaFileLine(item)
    +' &middot; uploaded by '+f.by+'</div>'
    +'</div>'
    +'<span class="lp-status-badge tone-'+statusTone(item.status)+'">'+item.status+'</span>'
    +'<button class="oca-doc-close" onclick="closeOcaDocPreview()" title="Close preview">'+OCA_ICO.x+'</button>'
    +'</div>'
    +'<div class="oca-doc-bar">'
    +'<span class="oca-doc-pgind" id="oca-doc-pgind">Page 1 of '+f.pages+'</span>'
    +'<div class="oca-doc-zoom">'
    +'<button class="oca-doc-zbtn" onclick="ocaDocZoomBy(-.1)" title="Zoom out">&minus;</button>'
    +'<span class="oca-doc-zlbl" id="oca-doc-zoom-lbl">100%</span>'
    +'<button class="oca-doc-zbtn" onclick="ocaDocZoomBy(.1)" title="Zoom in">+</button>'
    +'</div>'
    +'<button class="oca-doc-dl" onclick="ocaDocDownload('+item.id+')" title="Download">'+OCA_ICO.dl+'<span>Download</span></button>'
    +'</div>'
    +'<div class="oca-doc-viewer" id="oca-doc-viewer" onscroll="ocaDocOnScroll()">'+pages+'</div>'
    +'<div class="oca-doc-ft">'
    +'<span class="oca-doc-ft-q">'+(pending?'Read the document, then approve it or reject it with a reason':(OCA_NEXT[item.status]||''))+'</span>'
    +'<div class="oca-doc-ft-btns">'+foot+'</div>'
    +'</div>'
    +'</div></div>';
}
function openOcaDocPreview(id){
  const item=ocaItems.find(function(x){return x.id===id;});
  if(!item)return;
  // Nothing has been provided, so there is nothing to open - say so rather than
  // opening an empty viewer that implies a file arrived.
  if(!ocaHasFile(item)){
    showToast('Nothing to preview','info','"'+item.doc+'" has not been uploaded yet.');
    return;
  }
  closeOcaDocPreview();
  ocaDocOpenId=id;ocaDocZoom=1;
  const host=document.createElement('div');
  host.id='oca-doc-host';
  host.innerHTML=ocaDocViewerHTML(item);
  document.body.appendChild(host);
  document.addEventListener('keydown',ocaDocKey);
}
function closeOcaDocPreview(){
  const host=document.getElementById('oca-doc-host');
  if(host)host.remove();
  ocaDocOpenId=null;
  document.removeEventListener('keydown',ocaDocKey);
}
function ocaDocKey(e){if(e.key==='Escape')closeOcaDocPreview();}
// Zoom drives one custom property; the page and everything on it is sized in
// em off it, so zooming re-lays the pages out instead of scaling a picture of
// them - the scrollbars stay honest at every step.
function ocaDocZoomBy(d){
  ocaDocZoom=Math.min(OCA_DOC_MAX,Math.max(OCA_DOC_MIN,Math.round((ocaDocZoom+d)*10)/10));
  const v=document.getElementById('oca-doc-viewer');
  if(v)v.style.setProperty('--oca-z',ocaDocZoom);
  const l=document.getElementById('oca-doc-zoom-lbl');
  if(l)l.textContent=Math.round(ocaDocZoom*100)+'%';
}
function ocaDocOnScroll(){
  const v=document.getElementById('oca-doc-viewer'),l=document.getElementById('oca-doc-pgind');
  if(!v||!l)return;
  const pages=v.querySelectorAll('.oca-doc-page');
  let cur=1;
  for(let i=0;i<pages.length;i++)if(pages[i].offsetTop-v.scrollTop<=v.clientHeight*.35)cur=i+1;
  l.textContent='Page '+cur+' of '+pages.length;
}
// No file store, so there is nothing to hand over. Saying that is better than
// a button that silently does nothing.
function ocaDocDownload(id){
  const item=ocaItems.find(function(x){return x.id===id;});if(!item)return;
  showToast('Preview only','info','"'+ocaFileMeta(item).name+'" is not downloadable in this prototype.');
}
/* Deciding FROM the viewer. Both close it first and hand to the same dialog
   the panel's buttons use, so a decision taken while reading the document is
   recorded exactly like one taken from the panel - and still cannot go through
   without a comment. */
function ocaDocApprove(id){closeOcaDocPreview();ocaApprove(id);}
function ocaDocReject(id){closeOcaDocPreview();ocaReject(id);}

/* -- Offering the document ------------------------------------------------
   The strip above the decision bar. It states the file the decision is about -
   name, type, weight, who sent it - and opens it. A document that has not
   arrived gets the same strip in a muted form, because "there is nothing to
   read yet" is exactly what the admin needs to know before hunting for a
   button that is not there. */
function ocaDocStripHTML(item){
  if(!ocaHasFile(item)){
    return '<div class="oca-docstrip is-empty">'
      +'<div class="oca-docstrip-ico">'+OCA_ICO.file+'</div>'
      +'<div class="oca-docstrip-txt">'
      +'<div class="oca-docstrip-name">'+item.doc+'</div>'
      +'<div class="oca-docstrip-meta">Not uploaded yet &mdash; nothing to preview</div>'
      +'</div></div>';
  }
  const f=ocaFileMeta(item);
  return '<div class="oca-docstrip">'
    +'<div class="oca-docstrip-ico">'+ocaFileIco(item)+'</div>'
    +'<div class="oca-docstrip-txt">'
    +'<div class="oca-docstrip-name" title="'+attrSafe(f.name)+'">'+f.name+'</div>'
    +'<div class="oca-docstrip-meta">'+ocaFileLine(item)+' &middot; '+f.by+'</div>'
    +'</div>'
    +'<button class="oca-act oca-act-view" onclick="openOcaDocPreview('+item.id+')">'
    +OCA_ICO.eye+'<span>Preview</span></button>'
    +'</div>';
}
/* The Attachments tab's version: the same strip, with the facts about the file
   underneath it. This is the one place in the panel that is ABOUT the file
   rather than about the decision, so it is the one place that states its
   particulars in full. */
function ocaDocFileCardHTML(item){
  const cat=ocaCat(item.cat);
  if(!ocaHasFile(item)){
    return '<div class="oca-att-card">'+ocaDocStripHTML(item)+'</div>';
  }
  const f=ocaFileMeta(item);
  const row=function(k,v){return '<div class="oca-att-f"><span class="oca-att-k">'+k+'</span>'
    +'<span class="oca-att-v">'+v+'</span></div>';};
  return '<div class="oca-att-card">'+ocaDocStripHTML(item)
    +'<div class="oca-att-grid">'
    +row('File type',f.kind+' · '+f.pages+(f.pages===1?' page':' pages'))
    +row('Size',f.size)
    +row('Uploaded by',f.by)
    +row('Reference',ocaRef(item))
    +row('Document type',cat.label)
    +row(ocaDateLabel(item),ocaDateValue(item))
    +'</div>'
    +'<div class="oca-att-acts">'
    +'<button class="oca-act" onclick="ocaDocDownload('+item.id+')">Download</button>'
    +'<button class="oca-act oca-act-approve" onclick="openOcaDocPreview('+item.id+')">Open document</button>'
    +'</div>'
    +'</div>';
}
/* On a log entry — and only on ONE of them: the newest, and only while the
   document is still somebody's job.

   A timeline is history. Offering "view the document" against a step taken
   three weeks ago invites a reviewer to act on a line that has already been
   closed out, and on an approved record it offered a review of something that
   is not up for review any more. The entry at the top is the only one that
   describes where the document stands NOW, so it is the only one that carries
   the way in; once the record settles into Approved or Closed, no entry does.

   The file itself never becomes unreachable - the strip above the form, the
   Document field and the row's own button all still open it. What goes away is
   the suggestion that there is a decision waiting on it. */
function ocaLogViewHTML(item,l,i){
  if(i!==0||!ocaHasFile(item)||!ocaNeedsAction(item))return '';
  return ocaViewLinkHTML(item);
}
function ocaViewLinkHTML(item){
  return '<button class="oca-log-view" onclick="openOcaDocPreview('+item.id+')">'
    +OCA_ICO.eye+'<span>View document</span></button>';
}
/* The Workflow tab reads the same way: the current stage carries the link, the
   stages behind it are history, and a settled document offers none at all. */
const OCA_WF_NO_FILE=['Document Required','Document Requested','Upload Requested'];
function ocaWorkflowRows(item){
  const live=ocaHasFile(item)&&ocaNeedsAction(item);
  return ocaWorkflow(item).map(function(w,i){
    if(i!==0||!live||OCA_WF_NO_FILE.indexOf(w.title)>-1)return w;
    return {title:w.title,user:w.user,date:w.date,time:w.time,description:w.description,
      extra:ocaViewLinkHTML(item)};
  });
}

function ocaSaveLog(id){
  const item=ocaItems.find(function(x){return x.id===id;});if(!item)return;
  const was=item.status;
  // Read the comment before committing - lpCommitLog consumes the field.
  const inp=document.getElementById('oca-log-comment-inp');
  const comment=inp?inp.value.trim():'';
  ocaSeedLogs(item);      // seed first, or the fixture would land on top of the new entry
  if(!lpCommitLog(item,'oca-log-status-sel','oca-log-comment-inp',item.logs))return;
  /* This is the "maintained" half: a move made here is appended to the item's
     Workflow too, so the two tabs cannot end on different stories. A comment
     that does not move the status is a log entry only - the workflow records
     stages, not chatter. */
  if(item.status!==was){
    ocaWorkflow(item);    // seed first, so the new stage sits on top of the history
    wfPush(ocaWorkflowData,id,(OCA_STAGE[item.status]||OCA_STAGE['Pending Review']).title,
      'Moved from '+was+' to '+item.status+'. '+comment);
  }
  renderOcaDashboard();   // status drives the tiles and the row, so redraw both
  showToast('Log added','success',item.status!==was
    ? '"'+item.doc+'" moved to '+item.status+'.'
    : 'Comment saved to "'+item.doc+'".');
}
function renderOcaSidebar(){
  const item=ocaItems.find(function(x){return x.id===ocaSelectedId;});if(!item)return'';
  const cat=ocaCat(item.cat);
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'attachments',label:'Attachments'},
              {id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<div class="lp-isb-tabs" id="oca-isb-tabs">'+tabs.map(function(t){
      return '<button class="lp-isb-tab'+(ocaTab===t.id?' active':'')+'" onclick="navOcaTab(\''+t.id+'\')">'+t.label+'</button>';
    }).join('')+'</div>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeOcaSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  let body='';
  if(ocaTab==='basic-details'){
    const iUser='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    const iHash='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>';
    const iTag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
    const iFlag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
    const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    const iCheck='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    const fc=function(ico,label,val){return '<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';};
    const iFile='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    const dateVal=ocaDateValue(item);
    /* The record and nothing else. The Approve/Reject bar used to open this tab,
       which meant a decision could be taken from a screen that shows no history
       — and Reject then bounced you to Logs anyway to collect the reason. The
       bar now lives on Logs, above the timeline it writes into, so every move
       is made with the record's own history in front of you. "What to do next"
       stays here as a statement of fact. */
    body='<div class="lp-sb-detail-grid">'
      +fc(iFile,'Document',item.doc)+fc(iCheck,'Status',sbStatus(item.status))
      +fc(iUser,'Employee / Client',item.who)+fc(iHash,'Reference',ocaRef(item))
      +fc(iTag,'Document Type',cat.label)+fc(iFlag,'Uploaded By',ocaUploadedBy(item))
      +fc(iCal,ocaDateLabel(item),'<span class="oca-due'+(dateVal==='Today'?' is-now':'')+'">'+dateVal+'</span>')
      +fc(iCheck,'What to do next',OCA_NEXT[item.status]||'—')
      +'</div>';
  }else if(ocaTab==='history'){
    body=sbHistoryHTML(item);
  }else if(ocaTab==='logs'){
    const logs=ocaSeedLogs(item);
    // These four statuses are not the Active/Inactive pair the other panels use,
    // so the timeline colours come from the shared tone map instead.
    const tone=function(s){return statusTone(s);};
    // Newest first, so the step still outstanding sits above the newest entry.
    const formHTML='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+tone(item.status)+'"></span>'+item.status+'</div>'
      +'<p class="lp-logs-form-sub">'+(OCA_MOVE_PROMPT[item.status]||'Move this document on and say why')+'</p>'
      // Only the moves this document can actually make from where it is.
      +lpLogStatusField('oca-log-status-sel',item.status,ocaMoveOptions(item))
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="oca-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="ep-cancel-btn" style="flex:1" onclick="ocaCancelLog()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="ocaSaveLog('+item.id+')">Submit</button>'
      +'</div>'
      +'</div>';
    /* The document strip and the decision bar sit between the status bar and
       the table: they are about the move being made, not about the history. */
    body=lpLogsView(logs,formHTML,{
      /* The step still outstanding used to head the timeline; it is the bar's
         sub-line now. */
      sub:ocaNeedsAction(item)
        ?(OCA_NEXT_STEP[item.status]?'Next step: <b>'+OCA_NEXT_STEP[item.status]+'</b>. ':'')+(OCA_MOVE_PROMPT[item.status]||'')
        :(OCA_NEXT_DONE[item.status]||''),
      side:'<div class="lpl-side">'+ocaDocStripHTML(item)+ocaActionsHTML(item)+'</div>',
      rowExtra:function(l,i){return ocaLogViewHTML(item,l,i);}
    });
  }else if(ocaTab==='attachments'){
    /* Two different kinds of file, and they are not interchangeable. The
       compliance document is the record itself — derived, never uploaded here,
       and the thing the decision is about. Anything else is supporting paper,
       which is what the app's shared attachments tab handles everywhere else.
       Stacking them under two headings keeps that difference visible instead of
       dropping the document into a list where it could be "removed". */
    body='<div class="oca-att">'
      +'<div class="oca-att-h">Document under review</div>'
      +ocaDocFileCardHTML(item)
      +'<div class="oca-att-h">Supporting files</div>'
      +'<div class="oca-att-sub">Anything else that belongs on this record — correspondence, '
      +'earlier versions, proof of submission.</div>'
      +attachTabHTML('oca',item.id)
      +'</div>';
  }else if(ocaTab==='workflow'){
    body=wfTimelineHTML(wfOca(item));   // shared renderer, so it reads like every other Workflow tab
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function buildOcaListingHTML(){
  const rows=ocaRows();
  const last=ocaPageCount();
  if(ocaPage>last)ocaPage=last;
  const from=(ocaPage-1)*OCA_PAGE_SIZE;
  const page=rows.slice(from,from+OCA_PAGE_SIZE);
  // A panel must always belong to a row you can see, so a filter or a page turn
  // that drops the selected item closes it.
  if(ocaSelectedId&&!page.some(function(r){return r.id===ocaSelectedId;}))ocaSelectedId=null;
  const hamburgerIco='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';

  /* Eight columns was two too many, and the two that went were the ones already
     said elsewhere on the same row. Document type now rides under the document
     name and "Uploaded By" under the owner — the two-line cell this table
     already uses for name-over-reference. Six columns of real information beat
     eight of padded-out ones. */
  const body=page.length?page.map(function(r,i){
    const dv=ocaDateValue(r),upBy=ocaUploadedBy(r);
    const urgent=dv==='Today'||r.status==='Expiring Soon';
    return '<tr class="oca-row'+(ocaSelectedId===r.id?' lp-row-selected':'')+'" id="oca-row-'+r.id+'" style="cursor:pointer" onclick="openOcaSidebar('+r.id+')">'
      +'<td class="lp-c-n">'+(from+i+1)+'</td>'
      +'<td><div class="lp-c-main">'+r.who+'</div>'
        +'<div class="lp-c-sub">'+ocaRef(r)+'</div></td>'
      +'<td><div class="lp-c-name">'+r.doc+'</div>'
        +'<div class="lp-c-sub">'+ocaCatLabel(r.cat)+'</div></td>'
      +'<td><span class="lp-c-plain'+(upBy==='Not uploaded'?' is-none':'')+'">'+upBy+'</span></td>'
      // This one keeps its caption: the column holds two different meanings and
      // only the row knows which of them it is showing.
      +'<td><div class="lp-c-plain'+(urgent?' is-urgent':'')+'">'+dv+'</div>'
        +'<div class="lp-c-sub">'+ocaDateLabel(r)+'</div></td>'
      +'<td><span class="lp-status-badge tone-'+statusTone(r.status)+'">'+r.status+'</span></td>'
      +'<td onclick="event.stopPropagation()">'+rowLogCell('oca',r.id)+'</td>'
      +'</tr>';
  }).join('')
   :'<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--gray)">No compliance documents in this status.</td></tr>';

  // fixed-width window of page numbers so the control does not grow with the set
  let lo=Math.max(1,ocaPage-2),hi=Math.min(last,lo+4);
  lo=Math.max(1,hi-4);
  let nums='';
  for(let p=lo;p<=hi;p++)nums+='<button class="lp-pg-btn'+(p===ocaPage?' active':'')+'" onclick="ocaGoPage('+p+')">'+p+'</button>';
  const prevArrow='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>';
  const nextArrow='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>';
  const to=Math.min(from+OCA_PAGE_SIZE,rows.length);
  const pager='<div class="lp-pagination">'
    +'<span class="lp-pagination-info">Showing '+(rows.length?from+1:0)+'&ndash;'+to+' of '+rows.length+' entries</span>'
    +'<div class="lp-pagination-controls">'
    +'<button class="lp-pg-btn lp-pg-arrow" onclick="ocaGoPage('+(ocaPage-1)+')"'+(ocaPage===1?' disabled':'')+'>'+prevArrow+'</button>'
    +nums
    +'<button class="lp-pg-btn lp-pg-arrow" onclick="ocaGoPage('+(ocaPage+1)+')"'+(ocaPage===last?' disabled':'')+'>'+nextArrow+'</button>'
    +'</div></div>';

  /* No heading on this card. It went through three drafts — a title with a
     sub-line, then a title with a count — and every one of them was saying
     something the page already said. The tiles name the filter and show it
     selected, the pager under the table gives the count, and "compliance
     documents" is the dashboard the user is already on. The table is the card. */
  return '<div class="oca-list">'
    +'<div class="lp-split-wrap oca-split-wrap'+(ocaSelectedId?' has-sb':'')+'" id="oca-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table lp-table-2line"><thead><tr>'
    +'<th>S. No</th><th>Employee</th><th>Document</th><th>Uploaded By</th><th>Valid Till</th><th>Status</th><th>Action</th>'
    +'</tr></thead><tbody>'+body+'</tbody></table>'
    +pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(ocaSelectedId?' open':'')+'" id="oca-split-sb"><div class="lp-isb" id="oca-isb-inner">'+(ocaSelectedId?sbRender(renderOcaSidebar,'oca'):'')+'</div></div>'
    +'</div>'
    +'</div>';
}
// Rebuilt on every entry into this dashboard tab and after a filter/page change.
function renderOcaDashboard(){
  const el=document.getElementById('oca-dash');
  if(!el)return;
  el.innerHTML=buildOcaHeaderHTML()+buildOcaTilesHTML()+buildOcaListingHTML();
}

// ── RATES & RULES PAGE ──
function openRatesRuleSidebar(id){
  if(ratesRuleSelectedId!=null&&String(ratesRuleSelectedId)!==String(id)&&sbLeaveGuard('rr',function(){openRatesRuleSidebar(id);}))return;
  ratesRuleTab=sbKeepTab(ratesRuleSelectedId,ratesRuleTab);ratesRuleSelectedId=id;
  const sb=document.getElementById('rr-split-sb');if(sb)sb.classList.add('open');
  isbTab('rr',renderRatesRuleSidebar);   // body-only swap when the panel is already open
  document.querySelectorAll('.rr-row').forEach(r=>r.classList.toggle('lp-row-selected',r.id==='rr-row-'+id));
}
function closeRatesRuleSidebar(){if(sbLeaveGuard('rr',closeRatesRuleSidebar))return;sbEditing=null;
  ratesRuleSelectedId=null;
  const sb=document.getElementById('rr-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.rr-row').forEach(r=>r.classList.remove('lp-row-selected'));
}
function navRatesRuleTab(tab){if(!sbHasDraft('rr'))sbEditing=null;ratesRuleTab=tab;isbTab('rr',renderRatesRuleSidebar);}
function ratesRuleCancelLog(){
  const inp=document.getElementById('rr-log-comment-inp');if(inp)inp.value='';
  csClear('rr-log-status-sel');
}
function ratesRuleSaveLog(id){
  const item=ratesRulesData.find(x=>x.id===id);if(!item)return;
  const was=item.status;
  if(!lpCommitLog(item,'rr-log-status-sel','rr-log-comment-inp',ratesRulesLogsData[item.id]))return;
  renderADTPage();
  showToast('Log added','success',item.status!==was
    ? '"'+item.ruleName+'" moved to '+item.status+'.'
    : 'Comment saved to "'+item.ruleName+'".');
}
function renderRatesRuleSidebar(){
  const editBtn='<button class="lp-sb-view-edit-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>';
  const item=ratesRulesData.find(x=>x.id===ratesRuleSelectedId);if(!item)return'';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<div class="lp-isb-tabs" id="rr-isb-tabs">'+tabs.map(t=>'<button class="lp-isb-tab'+(ratesRuleTab===t.id?' active':'')+'" onclick="navRatesRuleTab(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'rr-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeRatesRuleSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const iFlag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2V4S16 4 12 4 4 6 4 6z"/><line x1="4" y1="22" x2="4" y2="4"/></svg>';
  const iId='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg>';
  const iBars='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="20" x2="6" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/></svg>';
  const iUser='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iDollar='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
  const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const fc=(ico,label,val)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
  let body='';
  if(ratesRuleTab==='basic-details'){
    // Same treatment as the Compliance panel: the name leads the grid as a
    // full-width field, and the six that follow fill the two columns evenly.
    const iTag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
    const iDot='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/></svg>';
    if(sbIsEditing('rr',item.id))body=sbHero({icon:sbIco.sliders,name:item.ruleName,meta:[item.country,item.category,item.applicableTo],status:sbHeroBadge(item.status),editing:true})+sbEditFormHTML('rr',item);
    else body=sbHero({icon:sbIco.sliders,name:item.ruleName,meta:[item.country,item.category,item.applicableTo],status:sbHeroBadge(item.status),edit:sbEditBtnFor('rr',item.id)})
      +'<div class="lp-sb-detail-grid">'
      +fc(iTag,'Rule Name',item.ruleName)+fc(iDot,'Status',sbStatus(item.status))
      +fc(iFlag,'Country',item.country)+fc(iBars,'Category',item.category)
      +fc(iId,'Applicable To',item.applicableTo)+fc(iDollar,'Value / Rate',item.valueRate)
      +fc(iUser,'Created By',item.createdBy)+fc(iCal,'Created On',lpCreatedOn(item.createdAt))
      +'</div>';
  }else if(ratesRuleTab==='history'){
    body=sbHistoryHTML(item);
  }else if(ratesRuleTab==='logs'){
    const logs=seedLogs(item,ratesRulesLogsData[item.id]);
    const logStatusKey=(s)=>({Active:'active',Inactive:'inactive'}[s]||'default');
    const csk=logStatusKey(item.status);
    const formHTML='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+csk+'"></span>'+item.status+'</div>'
      +'<p class="lp-logs-form-sub">Update rule status and add a comment</p>'
      +lpLogStatusField('rr-log-status-sel',item.status,['Active','Inactive'])
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="rr-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="ep-cancel-btn" style="flex:1" onclick="ratesRuleCancelLog()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="ratesRuleSaveLog('+item.id+')">Submit</button>'
      +'</div>'
      +'</div>';
    body=lpLogsView(logs,formHTML);
  }else if(ratesRuleTab==='workflow'){
    body=wfTimelineHTML(wfApproval(item,wfDoneFromLogs(seedLogs(item,ratesRulesLogsData[item.id])),'Admin'));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function buildRatesRulesHTML(){
  const countryOpts=['Netherlands'];
  const categoryOpts=['General','Income Tax','Social Security','Benefits','Health Ins.'];
  const statusOpts=['Active','Inactive'];
  /* Counted over the whole set, not the filtered one: a tile that only counts
     what is already on screen reads 0 the moment you filter it away, and the
     number a quick filter offers has to survive being used. */
  const rrActive=ratesRulesData.filter(function(r){return r.status==='Active';}).length;
  const rrInactive=ratesRulesData.filter(function(r){return r.status==='Inactive';}).length;
  let rows=ratesRulesData;
  if(ratesRuleCountryFilter)rows=rows.filter(r=>r.country===ratesRuleCountryFilter);
  if(ratesRuleCategoryFilter)rows=rows.filter(r=>r.category===ratesRuleCategoryFilter);
  if(ratesRuleStatusFilter)rows=rows.filter(r=>r.status===ratesRuleStatusFilter);
  if(ratesRuleSelectedId&&!rows.some(r=>r.id===ratesRuleSelectedId))ratesRuleSelectedId=null;
  const hamburgerIco='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const pgn=listPage('rates-rules',[ratesRuleCountryFilter,ratesRuleCategoryFilter,ratesRuleStatusFilter,ratesRuleSearchQuery].join('|'),lpSearchRows(rows,ratesRuleSearchQuery).map((r,i)=>'<tr class="rr-row'+(ratesRuleSelectedId===r.id?' lp-row-selected':'')+'" id="rr-row-'+r.id+'" style="cursor:pointer" onclick="openRatesRuleSidebar('+r.id+')">'
    +'<td style="color:var(--gray);font-size:13px">'+(i+1)+'</td>'
    +'<td style="font-weight:600;color:var(--navy)">'+r.country+'</td>'
    +'<td><span style="color:var(--orange);font-weight:500">'+r.ruleName+'</span></td>'
    +'<td>'+r.category+'</td>'
    +'<td>'+r.applicableTo+'</td>'
    +'<td style="font-weight:600;color:var(--navy)">'+r.valueRate+'</td>'
    +'<td><span class="lp-status-badge '+r.status.toLowerCase()+'">'+r.status+'</span></td>'
    +'<td onclick="event.stopPropagation()">'+rowLogCell('rates-rules',r.id)+'</td>'
    +'</tr>'),
    '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--gray)">No records match this filter.</td></tr>');
  const sbInner=ratesRuleSelectedId?renderRatesRuleSidebar():'';
  return '<div class="lp-page">'
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('rr-f-q',ratesRuleSearchQuery,'Search rule','applyRatesRuleFilters()')
    +apCS('rr-f-country',countryOpts,ratesRuleCountryFilter,'Country')
    +apCS('rr-f-category',categoryOpts,ratesRuleCategoryFilter,'Category')
    +apCS('rr-f-status',statusOpts,ratesRuleStatusFilter,'Status')
    +clearFiltersBtn([ratesRuleCountryFilter,ratesRuleCategoryFilter,ratesRuleStatusFilter,ratesRuleSearchQuery],'resetRatesRuleFilters()')
    +'<button class="lp-pill-search" onclick="applyRatesRuleFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'
    +'<div class="listing-stat'+(ratesRuleStatusFilter==='Active'?' stat-selected':'')+'" onclick="rrToggleStatFilter(\'Active\')"><div class="listing-stat-count" style="color:var(--st-ok-fg)">'+rrActive+'</div><div class="listing-stat-label">Active</div></div>'
    +'<div class="listing-stat'+(ratesRuleStatusFilter==='Inactive'?' stat-selected':'')+'" onclick="rrToggleStatFilter(\'Inactive\')"><div class="listing-stat-count" style="color:var(--st-idle-fg)">'+rrInactive+'</div><div class="listing-stat-label">Inactive</div></div>'
    +'</div></div>'
    +'<div class="lp-split-wrap" style="margin-top:14px"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr>'
    +'<th>S. No</th><th>Country</th><th>Rule Name</th><th>Category</th><th>Applicable To</th><th>Value</th><th>Status</th><th>Action</th>'
    +'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(ratesRuleSelectedId?' open':'')+'" id="rr-split-sb"><div class="lp-isb" id="rr-isb-inner">'+sbInner+'</div></div>'
    +'</div></div>'
    +(ratesRuleModalOpen?buildCreateRuleModalHTML():'')
    +(ratesRuleSuccessName?buildRuleSuccessModalHTML():'');
}
/* The tiles are a second way into the status filter, not a filter of their own -
   clicking one sets what the Status dropdown would have set, and clicking it
   again clears it. Same shape as the Payheads and Holidays tiles. */
function rrToggleStatFilter(v){
  ratesRuleStatusFilter=ratesRuleStatusFilter===v?'':v;
  ratesRuleSelectedId=null;renderADTPage();
}
function applyRatesRuleFilters(){
  ratesRuleCountryFilter=getCSValue('rr-f-country');
  ratesRuleCategoryFilter=getCSValue('rr-f-category');
  ratesRuleStatusFilter=getCSValue('rr-f-status');
  ratesRuleSearchQuery=lpSearchValue('rr-f-q');
  renderADTPage();
}
function resetRatesRuleFilters(){
  ratesRuleCountryFilter='';ratesRuleCategoryFilter='';ratesRuleStatusFilter='';ratesRuleSearchQuery='';
  renderADTPage();
}
function closeRatesRuleModal(){ratesRuleModalOpen=false;renderADTPage();}
function closeRuleSuccess(){ratesRuleSuccessName='';renderADTPage();}
/* segActive() lived here and read '.seg-btn.active' out of a .segmented strip.
   Every creation form's group is built by ciRadio() now — the same strip,
   drawn in one place — so the reader is its ciPicked() and the group keeps
   the old seg id as its name. */
function ruleCurrencySelectHTML(selected){return customSelect('rr-new-currency',selected||'','EUR,USD,INR,GBP'.split(','),'');}
/* Runs as ciRadio's onpick, so the segment is already selected by the time
   this is called — it only has to swap the field underneath. */
function toggleRuleValueField(btn){
  const wrap=document.getElementById('rr-value-field-wrap');if(!wrap)return;
  const isPercentage=btn.textContent.trim()==='Percentage';
  const valEl=document.getElementById('rr-new-value');
  const currentVal=valEl?valEl.value:'';
  const label=document.getElementById('rr-value-field-label');
  if(isPercentage){
    const cur=getCustomSelectValue('rr-new-currency');
    if(cur)wrap.dataset.savedCurrency=cur;
    wrap.innerHTML='<div class="input-suffix" style="max-width:100%"><input type="text" id="rr-new-value" placeholder="0" value="'+attrSafe(currentVal)+'"><span class="sfx">%</span></div>';
    if(label)label.textContent='Value';
  }else{
    wrap.innerHTML='<div class="pay-group">'+ruleCurrencySelectHTML(wrap.dataset.savedCurrency)+'<input type="text" id="rr-new-value" placeholder="0.00" value="'+attrSafe(currentVal)+'"></div>';
    if(label)label.textContent='Currency & Value';
  }
}
function saveRule(){
  const gv=(id)=>{const el=document.getElementById(id);return el?el.value.trim():'';};
  const name=gv('rr-new-name');
  if(!name)return;
  const category=getCustomSelectValue('rr-new-category')||'General';
  const employmentType=ciPicked('rr-new-emptype-seg','EOR');
  const country=getCustomSelectValue('rr-new-country')||'Netherlands';
  const applicableTo=getCustomSelectValue('rr-new-applicable')||employmentType;
  const currency=getCustomSelectValue('rr-new-currency')||'EUR';
  const valueType=ciPicked('rr-new-valuetype-seg','Fixed Amount');
  const ruleType=ciPicked('rr-new-type-seg','Statutory');
  const conditionOperator=ciPicked('rr-new-condop-seg','');
  const conditionValue=gv('rr-new-condval');
  const value=gv('rr-new-value');
  const minLimit=gv('rr-new-minlimit');
  const maxLimit=gv('rr-new-maxlimit');
  const effectiveFrom=gv('rr-new-efffrom');
  const effectiveTo=gv('rr-new-effto');
  const status=document.getElementById('rr-new-status')&&document.getElementById('rr-new-status').checked?'Active':'Inactive';
  const valueRate=valueType==='Percentage'?(value||'0')+'%':currency+' '+(value||'0');
  const now=new Date();
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h=now.getHours(),m=now.getMinutes(),s=now.getSeconds();
  const ampm=h>=12?'PM':'AM';h=h%12||12;
  const createdAt=String(now.getDate()).padStart(2,'0')+' '+months[now.getMonth()]+' '+now.getFullYear()+' | '+(h<10?'0'+h:h)+':'+(m<10?'0'+m:m)+':'+(s<10?'0'+s:s)+' '+ampm;
  lpLanded('rates-rules',ratesRuleNextId);
  ratesRulesData.unshift({id:ratesRuleNextId++,country,ruleName:name,category,applicableTo,valueRate,status,createdBy:'Shaun Mathew',createdAt,logs:[],
    ruleType,employmentType,currency,valueType,conditionOperator,conditionValue,minLimit,maxLimit,effectiveFrom,effectiveTo});
  ratesRuleModalOpen=false;
  ratesRuleSuccessName=name;
  renderADTPage();
  setTimeout(function(){if(ratesRuleSuccessName===name){ratesRuleSuccessName='';renderADTPage();}},2600);
}
function buildCreateRuleModalHTML(){
  const xSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  /* THE SAME RADIO TILE EVERY OTHER CREATION FORM USES. These were .segmented
   strips — a tab bar — for questions that are one-of-N answers, which is
   what a radio is. Read back with ciPicked(<group>). */
  const seg=(group,options,activeIdx)=>ciRadio(group,options,options[activeIdx||0]);
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create Rule</span><button class="ct-modal-close" onclick="closeRatesRuleModal()">'+xSvg+'</button></div>'
    +'<div class="ep-form-card" style="margin-bottom:16px">'
    +'<div class="ep-form-title">Rule Details</div>'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Rule Name <span class="req">*</span></label><input type="text" class="ep-form-input" id="rr-new-name" placeholder="Enter name"></div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Rule Type <span class="req">*</span></label>'+seg('rr-new-type-seg',['Statutory','Tax','Contribution','Allowance','Benefit'])+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Rule Category <span class="req">*</span></label>'+customSelect('rr-new-category','',['General','Income Tax','Social Security','Benefits','Health Ins.'],'Select Category')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employment Type <span class="req">*</span></label>'+seg('rr-new-emptype-seg',['EOR','PEO','Direct'])+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Country</label>'+customSelect('rr-new-country','',['Netherlands','Belgium','India','Germany','Spain'],'Select Country')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Applicable on <span class="req">*</span></label>'+customSelect('rr-new-applicable','',['EOR','PEO','EOR / PEO','Direct'],'Select')+'</div>'
    +'</div></div>'
    +'<div class="ep-form-card" style="margin-bottom:16px">'
    +'<div class="ep-form-title">Value &amp; Conditions</div>'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Value Type <span class="req">*</span></label>'
      +ciRadio('rr-new-valuetype-seg',['Fixed Amount','Percentage'],'Fixed Amount',false,'toggleRuleValueField(this)')+'</div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" id="rr-value-field-label">Currency &amp; Value</label><div id="rr-value-field-wrap"><div class="pay-group">'+ruleCurrencySelectHTML('')+'<input type="text" id="rr-new-value" placeholder="0.00"></div></div></div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Condition Operator</label>'+seg('rr-new-condop-seg',['Equals','Greater Than','Less Than','Between'])+'<span class="cmp-rule-hint">Optional &middot; narrows when this rule applies</span></div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Condition Value</label><input type="text" class="ep-form-input" id="rr-new-condval" placeholder="Enter value"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Minimum Limit</label><input type="text" class="ep-form-input" id="rr-new-minlimit" placeholder="Enter value"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Maximum Limit</label><input type="text" class="ep-form-input" id="rr-new-maxlimit" placeholder="Enter value"></div>'
    +'</div></div>'
    +'<div class="ep-form-card">'
    +'<div class="ep-form-title">Validity</div>'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Effective From <span class="req">*</span></label>'+apCD('rr-new-efffrom','','Select date')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Effective To</label>'+apCD('rr-new-effto','','Select date')+'</div>'
    +'</div>'
    +'<div class="cs-toggle-row"><div><div class="cs-toggle-label">Status</div><div class="cmp-rule-hint">Rule is applied to payroll calculations when active</div></div><label class="cs-toggle"><input type="checkbox" id="rr-new-status" checked><span class="cs-toggle-slider"></span></label></div>'
    +'</div>'
    +'<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">'
    +'<button class="ep-cancel-btn" onclick="closeRatesRuleModal()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="saveRule()">Save</button>'
    +'</div>'
    +'</div></div>';
}
function buildRuleSuccessModalHTML(){
  const checkSvg='<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  return '<div class="ct-modal-overlay">'
    +'<div class="rr-success-modal" onclick="event.stopPropagation()">'
    +'<button class="ct-modal-close" style="position:absolute;top:14px;right:14px" onclick="closeRuleSuccess()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
    +'<div class="rr-success-ring"><div class="rr-success-check">'+checkSvg+'</div></div>'
    +'<div class="rr-success-title">Rule Created</div>'
    +'<div class="rr-success-sub">&ldquo;'+ratesRuleSuccessName+'&rdquo; has been added to Rates &amp; Rules.</div>'
    +'</div></div>';
}

// ── CONTRACT TEMPLATES PAGE ──
function openCtpSidebar(id){
  if(ctpSelectedId!=null&&String(ctpSelectedId)!==String(id)&&sbLeaveGuard('ctp',function(){openCtpSidebar(id);}))return;
  ctpTab=sbKeepTab(ctpSelectedId,ctpTab);ctpSelectedId=id;
  const sb=document.getElementById('ctp-split-sb');if(sb)sb.classList.add('open');
  isbTab('ctp',renderCtpSidebar);   // body-only swap when the panel is already open
  document.querySelectorAll('.ctp-row').forEach(r=>r.classList.toggle('lp-row-selected',r.id==='ctp-row-'+id));
}
function closeCtpSidebar(){if(sbLeaveGuard('ctp',closeCtpSidebar))return;sbEditing=null;
  ctpSelectedId=null;
  const sb=document.getElementById('ctp-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.ctp-row').forEach(r=>r.classList.remove('lp-row-selected'));
}
function navCtpTab(tab){if(!sbHasDraft('ctp'))sbEditing=null;ctpTab=tab;isbTab('ctp',renderCtpSidebar);}
function ctpCancelLog(){
  const inp=document.getElementById('ctp-log-comment-inp');if(inp)inp.value='';
  csClear('ctp-log-status-sel');
}
function ctpSaveLog(id){
  const item=contractTemplatesData.find(x=>x.id===id);if(!item)return;
  const was=item.status;
  if(!lpCommitLog(item,'ctp-log-status-sel','ctp-log-comment-inp',ctpLogsData[item.id]))return;
  // the table badge and the Active/Inactive counters read off item.status, so
  // the whole page has to re-render, not just the panel
  renderADTPage();
  showToast('Log added','success',item.status!==was
    ? '"'+item.templateName+'" moved to '+item.status+'.'
    : 'Comment saved to "'+item.templateName+'".');
}
function renderCtpSidebar(){
  const editBtn='<button class="lp-sb-view-edit-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>';
  const item=contractTemplatesData.find(x=>x.id===ctpSelectedId);if(!item)return'';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'attachments',label:'Attachments'},{id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'ctp-isb-tabs\')" title="Scroll left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>'
    +'<div class="lp-isb-tabs" id="ctp-isb-tabs">'+tabs.map(t=>'<button class="lp-isb-tab'+(ctpTab===t.id?' active':'')+'" onclick="navCtpTab(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'ctp-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeCtpSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const iUser='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iBag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>';
  const iId='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg>';
  const iCheck='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const iFlag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2V4S16 4 12 4 4 6 4 6z"/><line x1="4" y1="22" x2="4" y2="4"/></svg>';
  const iBars='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="20" x2="6" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/></svg>';
  const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const fc=(ico,label,val)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
  let body='';
  if(ctpTab==='basic-details'){
    const statusVal=sbStatus(item.status);
    if(sbIsEditing('ctp',item.id))body=sbHero({icon:sbIco.fileText,name:item.templateName,meta:['Template ID '+item.templateId,item.employmentType,item.country],status:sbHeroBadge(item.status),editing:true})+sbEditFormHTML('ctp',item);
    else body=sbHero({icon:sbIco.fileText,name:item.templateName,meta:['Template ID '+item.templateId,item.employmentType,item.country],status:sbHeroBadge(item.status),edit:sbEditBtnFor('ctp',item.id)})
      +'<div class="lp-sb-detail-grid">'
      +fc(iUser,'Template Name',item.templateName)+fc(iCheck,'Status',statusVal)
      +fc(iBag,'Employment Type',item.employmentType)+fc(iId,'Template ID',item.templateId)
      +fc(iFlag,'Country',item.country)+fc(iBars,'Category',item.category)
      +'</div>';
  }else if(ctpTab==='attachments'){
    body=attachTabHTML('ctp',ctpSelectedId);
  }else if(ctpTab==='history'){
    body=sbHistoryHTML(item);
  }else if(ctpTab==='logs'){
    const logs=seedLogs(item,ctpLogsData[item.id]);
    const logStatusKey=(s)=>({Active:'active',Inactive:'inactive'}[s]||'default');
    const csk=logStatusKey(item.status);
    const formHTML='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+csk+'"></span>'+item.status+'</div>'
      +'<p class="lp-logs-form-sub">Update template status and add a comment</p>'
      +lpLogStatusField('ctp-log-status-sel',item.status,['Active','Inactive'])
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="ctp-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="ep-cancel-btn" style="flex:1" onclick="ctpCancelLog()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="ctpSaveLog('+item.id+')">Submit</button>'
      +'</div>'
      +'</div>';
    body=lpLogsView(logs,formHTML);
  }else if(ctpTab==='workflow'){
    body=wfTimelineHTML(wfApproval(item,wfDoneFromLogs(seedLogs(item,ctpLogsData[item.id])),'Legal'));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function buildContractTemplatesHTML(){
  const countryOpts=['Netherlands','India','Germany'];
  const categoryOpts=['Proposal','Contract','Onboarding'];
  const statusOpts=['Active','Inactive'];
  const ctpActive=contractTemplatesData.filter(function(r){return r.status==='Active';}).length;
  const ctpInactive=contractTemplatesData.filter(function(r){return r.status==='Inactive';}).length;
  let rows=contractTemplatesData;
  if(ctpCountryFilter)rows=rows.filter(r=>r.country===ctpCountryFilter);
  if(ctpCategoryFilter)rows=rows.filter(r=>r.category===ctpCategoryFilter);
  if(ctpStatusFilter)rows=rows.filter(r=>r.status===ctpStatusFilter);
  if(ctpSelectedId&&!rows.some(r=>r.id===ctpSelectedId))ctpSelectedId=null;
  const hamburgerIco='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const pgn=listPage('contract-templates',[ctpCountryFilter,ctpCategoryFilter,ctpStatusFilter,ctpSearchQuery].join('|'),lpSearchRows(rows,ctpSearchQuery).map((r,i)=>'<tr class="ctp-row'+(ctpSelectedId===r.id?' lp-row-selected':'')+'" id="ctp-row-'+r.id+'" style="cursor:pointer" onclick="openCtpSidebar('+r.id+')">'
    +'<td style="color:var(--gray);font-size:13px">'+(i+1)+'</td>'
    +'<td><span style="color:var(--orange);font-weight:500">'+r.templateName+'</span></td>'
    +'<td>'+r.employmentType+'</td>'
    +'<td style="color:var(--navy)">'+r.templateId+'</td>'
    +'<td>'+r.country+'</td>'
    +'<td>'+r.category+'</td>'
    +'<td><span class="lp-status-badge '+r.status.toLowerCase()+'">'+r.status+'</span></td>'
    +'<td onclick="event.stopPropagation()">'+rowLogCell('contract-templates',r.id)+'</td>'
    +'</tr>'),
    '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--gray)">No records match this filter.</td></tr>');
  const sbInner=ctpSelectedId?renderCtpSidebar():'';
  return '<div class="lp-page">'
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('ctp-f-q',ctpSearchQuery,'Search template','applyCtpFilters()')
    +apCS('ctp-f-country',countryOpts,ctpCountryFilter,'Country')
    +apCS('ctp-f-category',categoryOpts,ctpCategoryFilter,'Category')
    +apCS('ctp-f-status',statusOpts,ctpStatusFilter,'Status')
    +clearFiltersBtn([ctpCountryFilter,ctpCategoryFilter,ctpStatusFilter,ctpSearchQuery],'resetCtpFilters()')
    +'<button class="lp-pill-search" onclick="applyCtpFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'
    +'<div class="listing-stat'+(ctpStatusFilter==='Active'?' stat-selected':'')+'" onclick="ctpToggleStatFilter(\'Active\')"><div class="listing-stat-count" style="color:var(--st-ok-fg)">'+ctpActive+'</div><div class="listing-stat-label">Active</div></div>'
    +'<div class="listing-stat'+(ctpStatusFilter==='Inactive'?' stat-selected':'')+'" onclick="ctpToggleStatFilter(\'Inactive\')"><div class="listing-stat-count" style="color:var(--st-idle-fg)">'+ctpInactive+'</div><div class="listing-stat-label">Inactive</div></div>'
    +'</div></div>'
    +'<div class="lp-split-wrap" style="margin-top:14px"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr>'
    +'<th>S. No</th><th>Template Name</th><th>Employment Type</th><th>Template ID</th><th>Country</th><th>Category</th><th>Status</th><th>Action</th>'
    +'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(ctpSelectedId?' open':'')+'" id="ctp-split-sb"><div class="lp-isb" id="ctp-isb-inner">'+sbInner+'</div></div>'
    +'</div></div>'
    +(ctpModalOpen?buildCreateTemplateModalHTML():'')
    +(ctpSuccessName?buildCtpSuccessModalHTML():'');
}
function ctpToggleStatFilter(v){
  ctpStatusFilter=ctpStatusFilter===v?'':v;
  ctpSelectedId=null;renderADTPage();
}
function applyCtpFilters(){
  ctpCountryFilter=getCSValue('ctp-f-country');
  ctpCategoryFilter=getCSValue('ctp-f-category');
  ctpStatusFilter=getCSValue('ctp-f-status');
  ctpSearchQuery=lpSearchValue('ctp-f-q');
  renderADTPage();
}
function resetCtpFilters(){
  ctpCountryFilter='';ctpCategoryFilter='';ctpStatusFilter='';ctpSearchQuery='';
  renderADTPage();
}
function closeCtpModal(){ctpModalOpen=false;renderADTPage();}
function closeCtpSuccess(){ctpSuccessName='';renderADTPage();}
function flashFieldError(el){if(!el)return;el.style.borderColor='#b83a3a';setTimeout(()=>{el.style.borderColor='';},1500);}
function updateFileLabel(input,labelId){
  const el=document.getElementById(labelId);if(!el)return;
  if(input.files&&input.files[0]){el.textContent=input.files[0].name;el.classList.add('chosen');}
  else{el.textContent='No file chosen';el.classList.remove('chosen');}
}
function saveTemplate(){
  const nameEl=document.getElementById('ctp-new-name');
  const name=nameEl?nameEl.value.trim():'';
  const country=getCustomSelectValue('ctp-new-country');
  const employmentType=ciPicked('ctp-new-emptype-seg','EOR');
  const category=ciPicked('ctp-new-category-seg','Proposal');
  const status=document.getElementById('ctp-new-status')&&document.getElementById('ctp-new-status').checked?'Active':'Inactive';
  let ok=true;
  if(!name){flashFieldError(nameEl);ok=false;}
  if(!country){flashFieldError(document.querySelector('#ctp-new-country .custom-select-trigger'));ok=false;}
  if(!ok)return;
  const fileEl=document.getElementById('ctp-new-file');
  const fileName=fileEl&&fileEl.files&&fileEl.files[0]?fileEl.files[0].name:'';
  const now=new Date();
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h=now.getHours(),m=now.getMinutes(),s=now.getSeconds();
  const ampm=h>=12?'PM':'AM';h=h%12||12;
  const createdAt=String(now.getDate()).padStart(2,'0')+' '+months[now.getMonth()]+' '+now.getFullYear()+' | '+(h<10?'0'+h:h)+':'+(m<10?'0'+m:m)+':'+(s<10?'0'+s:s)+' '+ampm;
  lpLanded('contract-templates',ctpNextId);
  contractTemplatesData.unshift({id:ctpNextId,templateName:name,employmentType,templateId:String(ctpNextId),status,country,category,createdBy:'Shaun Mathew',createdAt,
    attachments:fileName?[{name:fileName}]:[],logs:[]});
  ctpNextId++;
  ctpModalOpen=false;
  ctpSuccessName=name;
  renderADTPage();
  setTimeout(function(){if(ctpSuccessName===name){ctpSuccessName='';renderADTPage();}},2600);
}
function buildCreateTemplateModalHTML(){
  const xSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const uploadIco='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  const req='<span class="req">*</span>';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create Template</span><button class="ct-modal-close" onclick="closeCtpModal()">'+xSvg+'</button></div>'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Template Name '+req+'</label><input type="text" class="ep-form-input" id="ctp-new-name" placeholder="e.g. NL EOR Proposal"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employment Type '+req+'</label>'
      +ciRadio('ctp-new-emptype-seg',['EOR','PEO','Direct'],'EOR')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Country '+req+'</label>'+customSelect('ctp-new-country','',['Netherlands','India','Germany','Belgium','Spain'],'Select Country')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Category '+req+'</label>'
      +ciRadio('ctp-new-category-seg',['Proposal','Contract','Onboarding'],'Proposal')+'</div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Template File (PDF only)</label>'
    +'<label class="ep-file-input" for="ctp-new-file"><span class="ep-file-btn">'+uploadIco+'Choose PDF</span><span class="ep-file-name" id="ctp-new-file-name">No file chosen</span></label>'
    +'<input type="file" id="ctp-new-file" accept=".pdf" style="display:none" onchange="updateFileLabel(this,\'ctp-new-file-name\')">'
    +'<span style="font-size:11px;color:var(--gray);margin-top:2px">Upload a PDF file &mdash; it will be stored as the template document.</span></div>'
    +'</div>'
    +'<div class="ep-form-card cmp-rules-card" style="margin-top:16px"><div class="cs-toggle-row"><div><div class="cs-toggle-label">Status</div><div class="cmp-rule-hint">Template is available for use when active</div></div><label class="cs-toggle"><input type="checkbox" id="ctp-new-status" checked><span class="cs-toggle-slider"></span></label></div></div>'
    +'<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px">'
    +'<button class="ep-cancel-btn" onclick="closeCtpModal()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="saveTemplate()">Create Template</button>'
    +'</div>'
    +'</div></div>';
}
function buildCtpSuccessModalHTML(){
  const checkSvg='<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  return '<div class="ct-modal-overlay">'
    +'<div class="rr-success-modal" onclick="event.stopPropagation()">'
    +'<button class="ct-modal-close" style="position:absolute;top:14px;right:14px" onclick="closeCtpSuccess()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
    +'<div class="rr-success-ring"><div class="rr-success-check">'+checkSvg+'</div></div>'
    +'<div class="rr-success-title">Template Created</div>'
    +'<div class="rr-success-sub">&ldquo;'+ctpSuccessName+'&rdquo; has been added to Contract Templates.</div>'
    +'</div></div>';
}

function buildEORContractHTML(){return buildContractFormHTML('EOR',ctFormStep);}
function buildPEOContractHTML(){return buildContractFormHTML('PEO',ctFormStep);}
/* ── Wizard radio groups ─────────────────────────────────────────────────────
   One segment of a .segmented strip — ciRadio's control, built one button at a
   time for the callers that need per-option handlers (the work-permit answer
   opens or seals the visa question under it) or a key on each button.

   Selection is two classes and nothing else: .active is what the strip CSS
   paints, .selected is what ctFormCaptureInto reads back. The label stays
   wrapped in a span, because capture reads '.selected span'.textContent.

   `attrs` is for a caller that has to find one option again later — the leave
   modal keys its duration buttons by data-type, because setAlDurationType() is
   called with a type rather than with the element that was clicked. */
function peoRadioSeg(groupClass,label,checked,onclick,attrs){
  return '<button type="button" class="'+groupClass+' seg-btn'+(checked?' active selected':'')+'"'
    +(attrs?' '+attrs:'')+' onclick="'+onclick+'">'
    +'<span>'+label+'</span></button>';
}
function peoSelectRadio(groupClass,clickedEl){
  document.querySelectorAll('.'+groupClass).forEach(function(r){r.classList.remove('selected','active');});
  clickedEl.classList.add('selected','active');
}
function peoSelectWorkPermit(el){
  peoSelectRadio('peo-wp-radio',el);
  peoApplyVisaGate(el.textContent.indexOf('has work permit')!==-1);
}
/* Visa assistance is PRD-Conditional on the worker NOT being authorised, so
   with a permit on file the question has nothing left to ask. It is dimmed and
   sealed rather than removed - a question that vanishes on click makes the card
   jump and leaves the reader unsure what they just did - and any answer already
   picked is dropped, because an "Employee would like ADT to assist" left over
   from before the switch would otherwise still reach the record's compliance
   checklist. */
function peoApplyVisaGate(hasPermit){
  const block=document.getElementById('peo-visa-block');
  if(!block)return;
  block.classList.toggle('peo-gated',hasPermit);
  if(hasPermit)block.querySelectorAll('.peo-radio-visa').forEach(function(r){r.classList.remove('selected','is-on');});
}
/* PRD 3.1 Step 2/3 type Job Title, Skill, Currency, Pay Frequency and Add New
   Leave Type as Dropdowns. This wizard used to draw its own native <select>;
   it now renders ciSelect, the same anchored-menu control the Immigration and
   Contractor forms use, so all three forms have ONE dropdown rather than three
   that drift apart. A value already on the record that is not in the list is
   prepended rather than silently dropped - an AI-prefilled job title has to
   survive the round trip. */
const CT_FORM_SKILLS=['ReactJS','Java','Python','Node.js','Kubernetes','SQL','Data Engineering','Machine Learning','Product Strategy','UX Research','Test Automation','Cloud Architecture','FP&A','Enterprise Sales'];
const CT_FORM_LEAVE_TYPES=['Paternity Leave','Casual Leave','Paid Leave','Unpaid Leave','Bereavement Leave','Study Leave'];
function ctFormDropdown(id,options,selected,placeholder){
  const opts=(selected&&options.indexOf(selected)===-1)?[selected].concat(options):options;
  return ciSelect(id,opts,selected||'',placeholder||'Select');
}
function buildContractStepCards(includeStep,prefill){
  const countries=['Afghanistan','Australia','Austria','Bangladesh','Belgium','Brazil','Canada','China','Denmark','Egypt','Finland','France','Germany','Ghana','Greece','India','Indonesia','Iran','Iraq','Ireland','Italy','Japan','Jordan','Kenya','Malaysia','Mexico','Morocco','Nepal','Netherlands','New Zealand','Nigeria','Norway','Pakistan','Philippines','Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia','Singapore','South Africa','South Korea','Spain','Sri Lanka','Sweden','Switzerland','Thailand','Turkey','Ukraine','United Arab Emirates','United Kingdom','United States','Vietnam'];
  let content='';

  if(includeStep(0)){
    content+=
      // Eligibility card
      '<div class="ep-form-card" style="margin-bottom:16px;padding:0;overflow:visible">'
      +'<div class="ep-form-title" style="padding:18px 24px;margin:0;background:#fafbfc;border-bottom:1px solid var(--border);border-radius:12px 12px 0 0">Eligibility</div>'
      +'<div style="padding:24px">'
      +'<div class="ep-form-grid" style="margin-bottom:20px">'
      +'<div class="ep-form-group"><label class="ep-form-label">Employee Nationality <span class="req">*</span></label>'
      +ctFormDropdown('peo-nationality',countries,prefill.nationality||'','Select country')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Country employee will be working from <span class="req">*</span></label>'
      +ctFormDropdown('peo-work-country',countries,prefill.country||'','Select country')+'</div>'
      +'</div>'
      /* PRD 3.1 Step 1 Eligibility is TWO rows here, not one: the
         authorisation question (mandatory) and the visa-assistance question
         (Conditional on the answer being No). One control answering both meant
         "No, and we do not want help" could not be expressed at all. */
      +(function(){
        /* Both answers are tiles now, and the second question reads as
           downstream of the first rather than as a second identical list
           sitting under it: with a permit on file it is dimmed and sealed,
           and the "(if not authorized)" that used to be stapled onto its
           label is a hint line under it instead. */
        const hasPermit=prefill.workPermit===true;
        const wp=function(sel,label){
          return peoRadioSeg('peo-wp-radio',label,sel,'peoSelectWorkPermit(this)');
        };
        const asked=hasPermit?'':(prefill.visaAssistance||'');
        const va=function(label){
          return peoRadioSeg('peo-radio-visa',label,asked===label,'peoSelectRadio(&quot;peo-radio-visa&quot;,this)');
        };
        return '<div class="peo-elig-q">'
          +'<div class="ep-form-label peo-elig-lbl">Is the employee authorized to work? <span class="req">*</span></div>'
          +'<div class="segmented">'
          +wp(hasPermit,'Yes - Employee has work permit')+wp(!hasPermit,'No')
          +'</div></div>'
          +'<div class="peo-elig-q'+(hasPermit?' peo-gated':'')+'" id="peo-visa-block">'
          +'<div class="ep-form-label peo-elig-lbl">Visa Assistance Required <span class="ci-cond">Conditional</span></div>'
          +'<div class="ci-hint peo-elig-hint">Asked only when the employee is not yet authorized to work in the destination country.</div>'
          +'<div class="segmented">'
          +va('Employee would like ADT to assist')+va('Not required')
          +'</div></div>';
      })()
      +'</div></div>'

      // Employee Information card
      +'<div class="ep-form-card" style="padding:0;overflow:visible">'
      +'<div class="ep-form-title" style="padding:18px 24px;margin:0;background:#fafbfc;border-bottom:1px solid var(--border);border-radius:12px 12px 0 0">Employee Information</div>'
      +'<div style="padding:24px">'
      +'<div class="ep-form-grid" style="margin-bottom:16px">'
      +'<div class="ep-form-group"><label class="ep-form-label">First Name <span class="req">*</span></label>'
      +'<input id="peo-fname" class="ep-form-input" type="text" placeholder="First Name" value="'+(prefill.fname||'')+'"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Last Name <span class="req">*</span></label>'
      +'<input id="peo-lname" class="ep-form-input" type="text" placeholder="Last Name" value="'+(prefill.lname||'')+'"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Gender</label>'
      +ctFormDropdown('peo-gender',['Male','Female','Non-binary','Prefer not to say'],prefill.gender||'','Select')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Email <span class="req">*</span></label>'
      +'<input id="peo-email" class="ep-form-input" type="email" placeholder="email@example.com" value="'+(prefill.email||'')+'"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Mobile Number <span class="req">*</span></label>'
      /* PRD types this "Contact Number (Country Code + Mobile)". The dial code
         used to be an id-less select, so nothing read it and the country code
         never reached the record. */
      +'<div class="ci-phone">'
      +ctFormDropdown('peo-dial',CI_DIAL,prefill.dial||'+91','+91')
      +'<input id="peo-mobile" class="ep-form-input" type="tel" placeholder="Mobile Number" value="'+(prefill.mobile||'')+'"></div></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Date of Birth <span class="req">*</span></label>'
      +apCD('peo-dob',prefill.dob||'','Select date')+'</div>'
      +'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Address <span class="req">*</span></label>'
      +'<textarea id="peo-address" class="ep-form-input" rows="3" placeholder="Address" style="resize:vertical;min-height:70px;line-height:1.5">'+(prefill.address||'')+'</textarea>'
      +'</div>'
      +'</div></div>';
  }

  if(includeStep(1)){
    /* Step 2's term/type answers use the same tile as Step 1, so the wizard
       does not change radio style halfway through. */
    const radioItem=function(grpClass,label,checked){
      return peoRadioSeg('peo-radio-'+grpClass,label,checked,'peoSelectRadio(&quot;peo-radio-'+grpClass+'&quot;,this)');
    };
    const today=new Date().toISOString().split('T')[0];
    content+=
      '<div class="ep-form-card" style="padding:24px">'
      +'<div style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:20px">Job Details</div>'

      // Job Title + Primary Skill
      +'<div class="ep-form-grid" style="margin-bottom:16px">'
      /* PRD 3.1 Step 2 types both of these Dropdown, not free text. The
         skill control used to be a text input wearing a chevron, which looked
         like a dropdown and behaved like neither. */
      +'<div class="ep-form-group"><label class="ep-form-label">Job Title <span class="req">*</span></label>'
      +ctFormDropdown('peo-jobtitle',EA_DESIGNATIONS,prefill.jobTitle,'Select job title')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Skill</label>'
      +ctFormDropdown('peo-skill',CT_FORM_SKILLS,prefill.skill,'Select skill')+'</div>'
      +'</div>'

      // Job Description
      +'<div class="ep-form-group" style="margin-bottom:6px"><label class="ep-form-label">Job Description <span class="req">*</span></label>'
      +'<textarea id="peo-jobdesc" class="ep-form-input" rows="4" placeholder="Enter job description" style="resize:vertical;min-height:90px;line-height:1.5">'+(prefill.jobDesc||'')+'</textarea></div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
      +'<span style="font-size:11.5px;color:#64748b">Job description will appear on the contract under <em>"Scope of Work / Job Responsibilities"</em></span>'
      +'<span style="font-size:11.5px;color:var(--orange);font-weight:600;flex-shrink:0;margin-left:12px">maximum 100 words</span>'
      +'</div>'

      // Employment Duration
      +'<div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:10px">Employment Duration</div>'
      +'<div style="display:flex;gap:16px;margin-bottom:6px">'
      +'<div style="flex:1">'+apCD('peo-from',prefill.fromDate||today,'Select date')+'</div>'
      +'<div style="flex:1">'+apCD('peo-to',prefill.toDate||'','Select date')+'</div>'
      +'</div>'
      /* PRD 3.1 Step 2: From Date is mandatory, To Date is "Conditional
         (Fixed Term)" - a permanent placement has no end date to give. */
      +'<div style="display:flex;gap:16px;margin-bottom:20px">'
      +'<div style="flex:1;font-size:11.5px;color:#64748b">From Date <span class="req">*</span></div>'
      +'<div style="flex:1;font-size:11.5px;color:#64748b">To Date <span class="ci-cond">Conditional (Fixed Term)</span></div>'
      +'</div>'

      // Employment Term + Employee Type radios
      +'<div class="ep-form-grid" style="margin-bottom:20px">'
      +'<div>'
      +'<div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:10px">Employment Term <span class="req">*</span></div>'
      +'<div class="segmented">'
      +radioItem('term','Permanent',prefill.employmentTerm?prefill.employmentTerm==='Permanent':true)
      +radioItem('term','Fixed Term',prefill.employmentTerm==='Fixed Term')
      +'</div>'
      +'</div>'
      +'<div>'
      +'<div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:10px">Employee Type <span class="req">*</span></div>'
      +'<div class="segmented">'
      +radioItem('emptype','Full Time',prefill.employeeType?prefill.employeeType==='Full Time':true)
      +radioItem('emptype','Part Time',prefill.employeeType==='Part Time')
      +'</div>'
      +'</div>'
      +'</div>'

      // Work Schedule (Hours) - PRD 3.1 Step 2, mandatory numeric
      +'<div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:10px">Work Schedule (Hours) <span class="req">*</span></div>'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">'
      +'<input id="peo-hours" class="ep-form-input" type="number" value="'+(prefill.hours||40)+'" min="1" style="width:80px;text-align:center">'
      +'<span style="font-size:13px;color:#64748b">Hours per week</span>'
      +'</div>'

      /* Section: Compensation - PRD 3.1 Step 2 lists Currency, Pay Amount and
         Pay Frequency as three mandatory rows. The old control hard-coded
         IN/INR and left the frequency select unlabelled and unread, so an
         EUR placement could not be entered and the frequency never reached
         the record. */
      +'<div style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:4px;padding-top:4px;border-top:1px solid var(--border);padding-top:20px">Compensation</div>'
      +'<div style="font-size:12px;color:#64748b;margin-bottom:14px">Enter the salary of the employee.</div>'
      +'<div class="ep-form-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label">Currency <span class="req">*</span></label>'
      +ctFormDropdown('peo-currency',CI_CURRENCIES,prefill.currency||'EUR','Select currency')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Pay Amount <span class="req">*</span></label>'
      +'<input id="peo-pay" class="ep-form-input" type="number" min="0" step="0.01" placeholder="e.g. 6250" value="'+(prefill.pay||'')+'"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Pay Frequency <span class="req">*</span></label>'
      +ctFormDropdown('peo-payfreq',CI_PAY_FREQ,prefill.payFrequency||'Monthly','Select frequency')+'</div>'
      +'</div>'

      +'</div>';
  }

  if(includeStep(2)){
    const thS='padding:10px 14px;font-size:12px;font-weight:600;color:#6b7280;border-bottom:1px solid var(--border);text-align:left';
    const tdS='padding:14px;font-size:13px;color:var(--navy);border-bottom:1px solid #f1f5f9;vertical-align:middle';
    /* The Additional cells are real PRD fields - "Annual Leave - Additional
       Days", "Sick Leave - Additional Days", "Maternity Leave - Additional
       Weeks" - so they carry ids and are read back on Next. Without ids they
       were three inputs that could be typed into and never reached anything. */
    /* --r-control, not --r-input: these three sit in a table beside square
       dropdowns and square number fields, and main.css's rule for a form card
       is that a control agrees with the field next to it. */
    const inputNum=function(id,val){return '<input id="'+id+'" type="number" value="'+(val||0)+'" min="0" style="width:60px;height:34px;padding:0 8px;border:1px solid var(--border);border-radius:var(--r-control);font-size:13px;text-align:center;font-family:inherit;outline:none;color:var(--navy)">';};
    content+=
      // Leave Entitlement card
      '<div class="ep-form-card" style="margin-bottom:16px;padding:0;overflow:hidden">'
      +'<div style="padding:18px 20px;border-bottom:1px solid var(--border)">'
      +'<div style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:3px">Leave Entitlement</div>'
      +'<div style="font-size:12px;color:var(--orange)">These are the mandatory leaves that employee shall receive</div>'
      +'</div>'
      +'<table style="width:100%;border-collapse:collapse">'
      +'<thead><tr>'
      +'<th style="'+thS+';width:45%">Leave Type</th>'
      +'<th style="'+thS+'">Mandatory</th>'
      +'<th style="'+thS+'">Additional</th>'
      +'<th style="'+thS+'">Total</th>'
      +'</tr></thead>'
      +'<tbody>'
      +'<tr>'
      +'<td style="'+tdS+'">'
      +'<div style="font-weight:600;color:var(--navy)">Annual Leaves</div>'
      +'<div style="font-size:11.5px;color:#3b82f6;margin-top:3px;line-height:1.4">Additional leaves will result in an additional deposit amount.</div>'
      +'</td>'
      +'<td style="'+tdS+';font-weight:600">18 Days</td>'
      +'<td style="'+tdS+'">'+inputNum('peo-leave-annual',prefill.leaveAnnual)+'</td>'
      +'<td style="'+tdS+';font-weight:600">'+(18+(parseInt(prefill.leaveAnnual,10)||0))+' Days</td>'
      +'</tr>'
      +'<tr>'
      +'<td style="'+tdS+';font-weight:600">Sick Leaves</td>'
      +'<td style="'+tdS+';font-weight:600">12 Days</td>'
      +'<td style="'+tdS+'">'+inputNum('peo-leave-sick',prefill.leaveSick)+'</td>'
      +'<td style="'+tdS+';font-weight:600">'+(12+(parseInt(prefill.leaveSick,10)||0))+' Days</td>'
      +'</tr>'
      +'<tr>'
      +'<td style="'+tdS+';font-weight:600;border-bottom:none">Maternity Leaves</td>'
      +'<td style="'+tdS+';font-weight:600;border-bottom:none">36 Weeks</td>'
      +'<td style="'+tdS+';border-bottom:none">'+inputNum('peo-leave-maternity',prefill.leaveMaternity)+'</td>'
      +'<td style="'+tdS+';font-weight:600;border-bottom:none">'+(36+(parseInt(prefill.leaveMaternity,10)||0))+' Weeks</td>'
      +'</tr>'
      +'</tbody></table>'
      /* PRD 3.1 Step 3 rows "Add New Leave Type" and "Leave Days (New Type)":
         a country or a client can carry a leave the three statutory rows above
         do not, and the intake is where that is declared. */
      +'<div style="padding:18px 20px;border-top:1px solid var(--border)">'
      +'<div class="ep-form-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label">Add New Leave Type</label>'
      +ctFormDropdown('peo-leave-newtype',CT_FORM_LEAVE_TYPES,prefill.leaveNewType,'Select leave type')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Leave Days (New Type)</label>'
      +'<input id="peo-leave-newdays" class="ep-form-input" type="number" min="0" placeholder="e.g. 10" value="'+(prefill.leaveNewDays||'')+'"></div>'
      +'</div></div>'
      +'</div>'

      // Probation Period
      +'<div class="ep-form-card" style="margin-bottom:16px;padding:20px 24px">'
      +'<div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:14px">Probation Period <span class="req">*</span></div>'
      +'<div style="border-top:1px dashed #e5e7eb;padding-top:14px">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
      +'<input id="peo-prob" class="ep-form-input" type="number" value="'+(prefill.probation||3)+'" min="0" style="width:80px;text-align:center">'
      +'<span style="font-size:13px;color:#64748b">months</span>'
      +'</div>'
      +'<div style="font-size:12px;color:#3b82f6;line-height:1.5">You will be invoiced a one time deposit equivalent to the employee\'s Gross Salary of 1 month.</div>'
      +'</div></div>'

      // Notice Period
      +'<div class="ep-form-card" style="padding:20px 24px">'
      +'<div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:14px">Notice Period <span class="req">*</span></div>'
      +'<div style="border-top:1px dashed #e5e7eb;padding-top:14px">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
      +'<input id="peo-notice" class="ep-form-input" type="number" value="'+(prefill.notice||3)+'" min="0" style="width:80px;text-align:center">'
      +'<span style="font-size:13px;color:#64748b">months</span>'
      +'</div>'
      +'<div style="font-size:12px;color:#3b82f6;line-height:1.5">You will be invoiced a one time deposit equivalent to the employee\'s Gross Salary of 1 month.</div>'
      +'</div></div>';
  }
  return content;
}
function buildContractFormHTML(type,step,splitMode){
  /* A manual run reads back what it captured, so stepping Back and Next again
     shows what was typed rather than an empty form. */
  const prefill=aiAssistedFlow?Object.assign({},aiContractPrefill||{},aiWizardFormData||{}):Object.assign({},ctFormData);
  const isAssistedReview=aiAssistedFlow&&splitMode;
  const includeStep=function(s){return isAssistedReview||step===s;};
  const steps=['Basic Details','Job Details','Other Details'];

  // Stepper bar
  const stepper=isAssistedReview?'':'<div style="display:flex;align-items:center;gap:0;margin-bottom:28px;background:#fff;border:1px solid var(--border);border-radius:12px;overflow:hidden;padding:20px 30px">'
    +steps.map(function(s,i){
      const active=i===step;
      const done=i<step;
      const circleStyle='width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;'
        +(done?'background:var(--orange);color:#fff;':active?'background:transparent;color:var(--orange);border:2px solid var(--orange);':'background:transparent;color:#d1d5db;border:2px solid #d1d5db;');
      const labelColor=active?'var(--orange)':done?'var(--navy)':'#9ca3af';
      const circleContent=done?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':(i+1);
      let html='<div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="ctFormGoStep('+i+')">'
        +'<div style="'+circleStyle+'">'+circleContent+'</div>'
        +'<span style="font-size:13px;font-weight:600;color:'+labelColor+'">'+s+'</span>'
        +'</div>';
      if(i<steps.length-1){
        html+='<div style="flex:1;height:1px;background:'+(done?'var(--orange)':'#e5e7eb')+';margin:0 20px;min-width:40px"></div>';
      }
      return html;
    }).join('')
    +'</div>';

  const content=buildContractStepCards(includeStep,prefill);

  const isLast=isAssistedReview||step===2;
  const goBack='ctFormBack()';
  const goNext='ctFormNext()';
  const finalAction=aiAssistedFlow?'aiSubmitAssistedContract(\''+type+'\')':'ctFormSubmit()';
  const footer='<div style="display:flex;align-items:center;justify-content:space-between;margin-top:24px">'
    +'<button class="ep-cancel-btn" style="border-radius:99px;display:inline-flex;align-items:center;gap:6px" onclick="'+goBack+'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</button>'
    +'<button class="ep-save-btn" style="padding:9px 28px;border-radius:99px" onclick="'+(isLast?finalAction:goNext)+'">'+( isLast?(aiAssistedFlow?'Create Proposal':'Submit Contract'):'Next')+'</button>'
    +'</div>';

  const aiHint=isAssistedReview?('<div style="margin-bottom:16px">'
    +'<div class="info-box tip" style="margin-bottom:10px"><div class="ib-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg></div><div><strong>AI pre-filled every field below</strong>Review the details, edit anything you like, then create the proposal.</div></div>'
    +aiCtCurrentAgentBadge()
    +'</div>'):'';
  const pageStyle=splitMode?'width:100%;padding:26px 30px;box-sizing:border-box':'max-width:820px;margin:0 auto';

  /* ct-form-page is a hook for the field-shape rules in contract-intake.css:
     this wizard runs on main.css's .ep-form-* system, which has no say over
     the date trigger's border weight. */
  return '<div class="ep-page ct-form-page" style="'+pageStyle+'">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">'
    +'<button class="ep-back" onclick="'+goBack+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> '+(step===0?ctIntakeExitLabel(type):'Back')+'</button>'
    +'<span style="font-size:12px;font-weight:700;color:#64748b;background:#f1f5f9;border:1px solid var(--border);padding:4px 12px;border-radius:999px;letter-spacing:.5px">'+type+'</span>'
    +'</div>'
    +'<div class="ep-header" style="margin-bottom:20px">'
    +'<div class="ep-title-wrap"><span class="ep-title">Create a Contract</span></div>'
    +'</div>'
    +stepper
    +aiHint
    +content
    +footer
    +'</div>';
}
/* ══ ADD CONTRACT: THE FOUR-CARD CHOOSER ════════════════════════════════════
   This is where a full-page type chooser earns its place, and the reason the
   listing does NOT have one: the intake forms genuinely diverge, so the choice
   has to be made before the form can be drawn. On the listing the same choice
   is just a filter, and a filter does not need a whole screen.

   Four cards, three forms. EOR and PEO are still two cards because they are
   two products a client buys separately - the card is where that decision is
   made - and they then land on one shared wizard carrying the type. Collapsing
   them into a single "EOR/PEO" card would ask the user to know which one they
   are on before the product has told them.

   Same icons as the type band, deliberately - the tile you filter by and the
   card you create from are the same object seen twice, and using two icon sets
   for that makes them look like two different concepts.

   Cards are built from CT_TYPES, so a fifth type appears here automatically. */
function ctStartIntake(key,from){
  const cfg=CT_TYPES[key];
  if(!cfg||!ctTypeEnabled(key))return;
  ctIntakeFrom=from==='listing'?'listing':'chooser';
  /* Single entry point. The chooser calls it, and so can anything else that
     already knows the type - a deep link, the AI assistant's routing, a
     "Create Immigration request" button on an empty state - so none of them
     has to walk the user through a chooser they have already answered. */
  /* EOR and PEO are ONE form. Immigration and Contractor each have their own,
     because they ask different questions: an Immigration case turns on a
     passport, a permit category and a filing date, and a Contractor engagement
     turns on a rate, an invoicing cycle and a classification test. Neither has
     a probation period or a leave entitlement, which is most of what the
     EOR/PEO wizard's third step is. */
  if(key==='EOR'||key==='PEO'){ctFormOpen(key);return;}
  if(key==='IMMIGRATION'){imgOpenIntake();return;}
  if(key==='CONTRACTOR'){cnrOpenIntake();return;}
}
function buildContractTypeSelectHTML(){
  const card=function(key){
    const cfg=CT_TYPES[key];
    const on=ctTypeEnabled(key);
    return '<div class="ct-choose-card'+(on?'':' is-disabled')+'"'
      +(on?'':' title="'+cfg.label+' is not enabled for this account. Talk to your account manager to add it."')+'>'
      +'<div class="ct-choose-ico">'+sbIco[cfg.icon]+'</div>'
      +'<div class="ct-choose-body">'
      +'<div class="ct-choose-title">'+cfg.cardTitle+'</div>'
      +'<div class="ct-choose-desc">'+cfg.desc+'</div>'
      +'</div>'
      +'<div class="ct-choose-foot">'
      +(on
        ? '<button type="button" class="ct-choose-btn" onclick="ctStartIntake(\''+key+'\')">Create '+cfg.label+' contract</button>'
        : '<span class="ct-choose-off">Not enabled for this account</span>')
      +'</div></div>';
  };
  return '<div class="ep-page" style="max-width:880px;margin:0 auto">'
    +'<div><button class="ep-back" onclick="page=\'contracts\';renderADTPage()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to Contracts</button></div>'
    +'<div class="ep-header">'
    +'<div class="ep-title-wrap"><span class="ep-title">Create Contract</span></div>'
    +'</div>'
    +'<div class="ct-choose-sub">Pick the type of engagement. Each one has its own intake, its own statuses and its own compliance checks.</div>'
    +'<div class="ct-choose-grid">'+CT_TYPE_ORDER.map(card).join('')+'</div>'
    +'</div>';
}
/* Where the open intake was started from, so step one's Back returns there.
   From a type-filtered listing the type was already answered - sending Back
   to the four-card chooser would ask the question again and drop the user's
   place in the list. */
var ctIntakeFrom='chooser';
function ctIntakeExit(){
  page=ctIntakeFrom==='listing'?'contracts':'contract-type-select';
  renderADTPage();
}
function ctIntakeExitLabel(typeKey){
  return ctIntakeFrom==='listing'?'Back to '+ctTypeCfg(typeKey).label+' contracts':'Back to Create Contract';
}
/* ══ ALL CONTRACTS: ONE LISTING, FOUR TYPES ═════════════════════════════════
   The type band is a FILTER above the table, not a gate in front of it. An
   interstitial that makes you choose a type before any data loads costs a
   click on every visit, hides cross-type work (an AM owning one Immigration
   case and two EOR placements can no longer see both), and lands every
   bookmark and email deep link on a chooser instead of a record. The
   four-card chooser belongs on Add Contract, where the four intake forms
   genuinely diverge - and that is where it is.

   Everything below reads CT_TYPES / CT_FLOWS from contract-types.js. There is
   no per-type branch in this file beyond "look the config up". */

/* One filter pass, shared by the table, the tile counts and the summary cards,
   so a count can never disagree with the rows underneath it. */
function ctFilteredRows(typeSel,statusSel){
  const t=typeSel===undefined?ctTypeFilter:typeSel;
  const s=statusSel===undefined?ctQuickStatusFilter:statusSel;
  const q=ctSearchQuery.trim().toLowerCase();
  /* A type the account has not bought returns nothing at all, rather than
     rows the account is not entitled to see. The landing card already refuses
     to open it and ctOpenType() refuses too, so this is the backstop for a
     deep link or a stale filter - and it is what makes the "not enabled for
     this account" empty state fire instead of a table full of rows. */
  if(t&&t!==CT_TYPE_ALL&&!ctTypeEnabled(t))return [];
  return contractsData.filter(function(c){
    if(t&&t!==CT_TYPE_ALL&&ctTypeKey(c.type)!==t)return false;
    if(ctCountryFilter&&c.country!==ctCountryFilter)return false;
    if(q&&(c.empName+' '+c.contractId+' '+(c.empDesig||'')).toLowerCase().indexOf(q)===-1)return false;
    /* One rule in both views: the filter is an exact status. It used to fork
       - a phase name on All, a status inside a type - and the dashboard had to
       be special-cased around the fork, because its tiles link in with an
       exact status ("Onboarding", "Ready for Payroll" - see DASH_CARD_FILTER)
       and the band still on All. That is just the normal path now. */
    if(s&&c.status!==s)return false;
    return true;
  });
}

/* The same rows, split by phase. A bare total answers "how many records exist
   under this type", which is not the question anyone opens Contracts with -
   "how much of this is still moving" is. Two contract types can both read 6
   and mean completely different days' work: six live placements is a payroll
   run, six mid-flight ones is six things waiting on somebody.

   Derived from ctFilteredRows and ctPhaseOf, not from a second status list, so
   the split cannot drift from the table or from the summary cards. Everything
   that is neither Active nor Closed counts as in progress - that keeps the two
   numbers plus closed adding to the total no matter what stages a future type
   adds. */
function ctTileSplit(typeKey){
  const statusIsShared=ctTypeFilter===CT_TYPE_ALL?ctQuickStatusFilter:'';
  const rows=ctFilteredRows(typeKey,statusIsShared);
  let active=0,closed=0;
  rows.forEach(function(c){
    const ph=ctPhaseOf(c.status);
    if(ph==='Active')active++;
    else if(ph==='Closed')closed++;
  });
  return {total:rows.length,active:active,closed:closed,progress:rows.length-active-closed};
}

/* Whether anything is narrowing the counts the landing is about to print.
   The gate has no filter bar of its own, but Country and Search SURVIVE
   ctBackToTypes() - so a card can legitimately read 2 when the type holds 11,
   with nothing on screen to say why. Either clear them on the way back (loses
   the filter the moment you check another type - the exact thing someone
   comparing countries is doing) or say so. This says so. */
function ctLandingFiltersActive(){
  return !!(ctCountryFilter||ctSearchQuery||(ctTypeFilter===CT_TYPE_ALL&&ctQuickStatusFilter));
}
function ctSetType(key){
  if(ctTypeFilter===key)return;
  ctTypeFilter=key;
  ctQuickStatusFilter='';
  ctSelectedId=null;
  renderADTPage();
}

/* ── Summary cards ────────────────────────────────────────────────────────
   Type-scoped, and each one is a filter: clicking drills into the list below
   rather than opening a separate report. */
function ctSummaryCardsHTML(){
  const cards=ctSummaryCardsFor(ctTypeFilter);
  return '<div class="listing-stats ct-stats">'+cards.map(function(card){
    const val=card.status;
    const n=ctFilteredRows(ctTypeFilter,val).length;
    const on=ctQuickStatusFilter===val;
    return '<div class="listing-stat'+(on?' stat-selected':'')+'" onclick="ctToggleStatFilter(\''+val+'\')">'
      +'<div class="listing-stat-count" style="color:var(--st-wait-fg)">'+n+'</div>'
      +'<div class="listing-stat-label">'+card.label+'</div></div>';
  }).join('')+'</div>';
}

/* ── Empty states ─────────────────────────────────────────────────────────
   Three distinct cases. One generic "no data" line for all three is the thing
   this replaces: it cannot tell a new customer apart from a bad filter, and it
   gives neither of them the next step. */
function ctEmptyStateHTML(){
  const cfg=ctTypeFilter===CT_TYPE_ALL?null:CT_TYPES[ctTypeFilter];
  const wrap=function(inner){return '<tr><td colspan="9"><div class="ct-empty">'+inner+'</div></td></tr>';};
  if(cfg&&!ctTypeEnabled(ctTypeFilter)){
    return wrap('<div class="ct-empty-ico">'+sbIco[cfg.icon]+'</div>'
      +'<div class="ct-empty-title">'+cfg.label+' is not enabled for this account</div>'
      +'<div class="ct-empty-sub">Your account manager can switch it on.</div>');
  }
  /* A filter is applied and matched nothing - the list itself is not empty. */
  const anyOfType=ctFilteredRows(ctTypeFilter,'').length;
  if(anyOfType>0||ctCountryFilter||ctSearchQuery||ctQuickStatusFilter){
    return wrap('<div class="ct-empty-title">No results for these filters</div>'
      +'<div class="ct-empty-sub">Try a different country, status or search term.</div>'
      +'<button class="lp-pill-search" onclick="resetCtFilters()">Reset filters</button>');
  }
  if(cfg){
    return wrap('<div class="ct-empty-ico">'+sbIco[cfg.icon]+'</div>'
      +'<div class="ct-empty-title">No '+cfg.label+' contracts yet</div>'
      +'<div class="ct-empty-sub">'+cfg.desc+'</div>'
      +'<button class="lp-pill-search" onclick="addListingItem(\'contracts\')">Create '+cfg.label+' request</button>');
  }
  return wrap('<div class="ct-empty-title">No contracts yet</div>'
    +'<button class="lp-pill-search" onclick="addListingItem(\'contracts\')">Add Contract</button>');
}

/* ══ CONTRACTS LANDING: PICK A TYPE FIRST ═══════════════════════════════════
   Contracts opens on four type cards, and the table appears once one is
   chosen. Counts are live, so the cards double as the breakdown you would
   otherwise have gone to the list to read.

   WHAT IS ON THIS SCREEN, AND WHAT WAS TAKEN OFF IT.
   Four cards, a heading, and nothing else. It previously also carried a
   five-cell pipeline strip, a "View all N contracts" button and two panels
   underneath (contracts waiting on a client, and a country breakdown). All of
   it is gone. The screen asks one question - which book of work are you here
   for - and every extra row of figures was something to read BEFORE you could
   answer it, on a page most people cross in under a second.

   The mixed all-types list is no longer a destination this screen offers. It
   still EXISTS: the Contract Type control on the listing has an All Types
   option, so an account manager holding an EOR placement and an Immigration
   case for the same person can still see both in one view. It is now one step
   further in, which is the right depth for a view you reach deliberately
   rather than the default door.

   What each card keeps is the three figures that belong to a type and to
   nothing else: how many contracts, how many are live, how many are still
   moving. Every one of them comes from ctFilteredRows, so a card cannot
   disagree with the table it opens. */
function buildContractsLandingHTML(){
  /* One base pass for the whole screen, so the cards count the same rows the
     list will show. */
  const card=function(key){
    const cfg=CT_TYPES[key];
    const on=ctTypeEnabled(key);
    const split=ctTileSplit(key);
    /* A disabled type prints no number. The count would be 0 whatever the
       account actually holds - ctFilteredRows returns nothing for a type the
       tenant has not bought - and a 0 next to a real 11 reads as "you have
       none of these", which is a different sentence from "you have not bought
       this". The chip says which. */
    const metric=on
      ? '<span class="ct-land-metric"><span class="ct-land-count">'+split.total+'</span>'
        +'<span class="ct-land-unit">'+(split.total===1?'contract':'contracts')+'</span></span>'
      : '<span class="ct-land-chip">Not enabled</span>';
    /* Footer is the one thing the total cannot say: how much of this is live
       versus still moving. Two contract types can both read 6 and mean
       completely different days' work. On an empty type it says so in words
       instead of printing "0 Active / 0 In progress", which is two figures to
       read for one meaning. */
    const foot=!on?''
      :'<span class="ct-land-foot">'
        +(split.total
          ? '<span class="ct-land-stat is-live"><b>'+split.active+'</b>Active</span>'
            +'<span class="ct-land-stat"><b>'+split.progress+'</b>In progress</span>'
          : '<span class="ct-land-foot-txt">No contracts yet</span>')
        +'</span>';
    return '<button type="button" class="ct-land-card'+(on?'':' is-disabled')+'"'
      +(on?' onclick="ctOpenType(\''+key+'\')"'
          :' aria-disabled="true" title="'+cfg.label+' is not enabled for this account. Talk to your account manager to add it."')+'>'
      +'<span class="ct-land-top">'
      +'<span class="ct-land-ico">'+sbIco[cfg.icon]+'</span>'
      +metric
      +'</span>'
      +'<span class="ct-land-label">'+cfg.label
      +(on?'<span class="ct-land-go"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>':'')
      +'</span>'
      +'<span class="ct-land-desc">'+(on?cfg.blurb:'Not enabled for this account.')+'</span>'
      +foot
      +'</button>';
  };
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div class="ct-land-head"><div class="ct-land-head-main">'
    +'<div class="ct-land-title">Contracts</div>'
    +'<div class="ct-land-sub">Pick a contract type to open its contracts.</div>'
    +'</div></div>'
    /* Filters survive the trip back from the list, so the numbers on this
       screen can legitimately be a subset with nothing on screen to say why.
       One line, and a way out of it. */
    +(ctLandingFiltersActive()
      ? '<div class="ct-land-note">Counts are narrowed by the filters still applied on the list.'
        +'<button type="button" class="ct-land-note-btn" onclick="resetCtFilters()">Clear filters</button></div>'
      : '')
    +'<div class="ct-land-grid">'+CT_TYPE_ORDER.map(card).join('')+'</div>'
    +'</div>';
}
/* Entering the list from a card. Clears the status filter for the same reason
   ctSetType does - the vocabulary the old value belonged to is being
   replaced - and clears the row selection, which almost certainly is not in
   the new result set. */
function ctOpenType(key){
  if(key!==CT_TYPE_ALL&&!ctTypeEnabled(key))return;
  ctTypeFilter=key;
  ctQuickStatusFilter='';
  ctSelectedId=null;
  ctLandingOpen=false;
  renderADTPage();
}
function ctBackToTypes(){
  ctLandingOpen=true;
  ctSelectedId=null;
  renderADTPage();
}
function buildContractsListingHTML(){
  const d='<span style="color:#9ca3af">--</span>';
  const isAll=ctTypeFilter===CT_TYPE_ALL;
  const cfg=isAll?null:CT_TYPES[ctTypeFilter];
  const countries=[...new Set(contractsData.map(c=>c.country))].sort();
  const dotsIco='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const filteredContracts=ctFilteredRows();
  /* Pagination resets to page 1 whenever any filter changes, and only then -
     see listPage(). The signature has to name every filter or a type change
     leaves you on page 3 of a list that now has one page. */
  const sig=[ctTypeFilter,ctQuickStatusFilter,ctCountryFilter,ctSearchQuery].join('|');
  const pgn=listPage('contracts',sig,filteredContracts.map((c,ctRowIdx)=>{
    /* The Action menu walks THIS record's type's stage list. One menu builder,
       four flows - not four menu builders. */
    const flow=ctFlowFor(c.type);
    const flowIdx=flow.indexOf(c.status);
    const menuItems=flow.map((step,i)=>{
      const isDone=flowIdx>i;
      const isCurrent=flowIdx===i;
      const cls=isDone?'done':isCurrent?'current':'next';
      const checkIco=isDone?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':(i+1);
      const click=(!isDone&&!isCurrent)?'onclick="ctPickStatus('+c.id+',\''+step+'\')"':'';
      return '<div class="ct-act-item '+cls+'" '+click+'><span class="ct-act-step '+cls+'">'+checkIco+'</span>'+step+'</div>';
    }).join('');
    // Shortened by the pill's CSS ("…"), the whole status on the title.
    const btnLabel=c.status;
    const actionBtn='<div class="ct-action-wrap">'
      +'<button class="ct-action-btn" title="'+attrSafe(c.status)+'" onclick="toggleCtAction('+c.id+',event)"><span>'+btnLabel+'</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>'
      +'<button class="ct-dots-btn" onclick="openCtSidebar('+c.id+');event.stopPropagation()">'+dotsIco+'</button>'
      +'<div class="ct-action-menu" id="ctm-'+c.id+'">'+menuItems+'</div>'
      +'</div>';
    /* In the All view the type cell is the ONLY thing that tells a mixed list
       apart, so it carries both levels: contract type, then service or
       employment type. Inside a single type the first line would repeat the
       tile you already selected, so it drops away. */
    const rowCfg=ctTypeCfg(c.type);
    const svc=c[rowCfg.typeField]||d;
    const typeCell=isAll
      ? '<div style="font-weight:600;color:var(--navy)">'+rowCfg.short+'</div><div style="font-size:11px;color:#9ca3af">'+svc+'</div>'
      : svc;
    return '<tr class="ct-row'+(ctSelectedId===c.id?' lp-row-selected':'')+'" id="ct-row-'+c.id+'" style="cursor:pointer" onclick="openCtSidebar('+c.id+')">'
      +'<td style="color:#6b7280;font-size:13px">'+(ctRowIdx+1)+'</td>'
      +'<td style="font-weight:600;color:var(--navy)">'+c.contractId+'</td>'
      +'<td><div style="font-weight:600;color:var(--navy)">'+c.empName+'</div><div style="font-size:11px;color:#9ca3af">'+c.empDesig+'</div></td>'
      +'<td>'+c.country+'</td>'
      +'<td>'+typeCell+'</td>'
      +'<td>'+d+'</td>'
      +'<td style="font-size:12px;color:#64748b">'+c.date+'</td>'
      +'<td>'+ctStatusBadge(c.status)+'</td>'
      +'<td onclick="event.stopPropagation()">'+actionBtn+'</td>'
      +'</tr>';
  }),ctEmptyStateHTML());
  const sbInner=ctSelectedId?renderCtSidebar():'';
  /* Column headers follow the type, per the PRD: an Immigration case has a
     Client / Worker, not an Employee. */
  const nameHdr=isAll?'Name':cfg.nameCol;
  const typeHdr=isAll?'Type':cfg.typeCol;
  return '<div class="lp-page">'
    +dashboardBackHTML()
    /* Having entered through the type cards, the gate needs a visible door
       back or that first screen becomes unreachable. */
    +'<button class="ep-back" style="margin:0 0 14px" onclick="ctBackToTypes()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Contract types</button>'
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    /* Contract Type is a plain filter here, alongside Country and Status - the
       four cards on the way in have already done the choosing, and repeating
       them above the table would be the same control twice on one screen.

       It is the one filter that applies on SELECTION rather than on Search.
       The rest of the bar narrows rows; this one changes what the other
       controls MEAN - the Status list, the column headers and the summary
       cards all follow it. Deferring it to Search would leave a stale Status
       dropdown offering the previous type's vocabulary, and picking from it
       would return nothing. csSelect() routes the change (see its csid chain,
       the same way ap-filter-type and lp-filter-field are handled). */
    /* Search leads here too, in front of the type band. */
    +lpSearchField('ct-search-inp',ctSearchQuery,'Search name, ID','applyCtFilters()')
    +apCS('ct-f-type',[CT_TYPE_LABEL_ALL].concat(CT_TYPE_ORDER.map(k=>CT_TYPES[k].label)),ctTypeFilterLabel(),'All Types')
    +apCS('ct-f-country',countries,ctCountryFilter,'All Countries')
    /* Options follow the selected type: that type's own flow, or - on All
       Types - every status any flow can produce, so the list only ever names
       states a row in view can be in. */
    +apCS('ct-f-status',ctStatusOptionsFor(ctTypeFilter),ctQuickStatusFilter,'All Statuses')
    /* Contract Type counts as an applied filter now that it is one of the
       controls in this bar - Reset clears it back to All Types along with the
       rest. */
    +clearFiltersBtn([ctQuickStatusFilter,ctCountryFilter,ctSearchQuery,isAll?'':ctTypeFilter],'resetCtFilters()')
    +'<button class="lp-pill-search" onclick="applyCtFilters()">Search</button>'
    +'</div></div>'
    +ctSummaryCardsHTML()
    +'</div>'
    +'<div class="lp-split-wrap" style="margin-top:14px"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr>'
    +'<th>S.No</th><th>Contract ID</th><th>'+nameHdr+'</th><th>Country</th><th>'+typeHdr+'</th><th>Compliance</th><th>Date</th><th>Status</th><th>Action</th>'
    +'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(ctSelectedId?' open':'')+'" id="ct-split-sb"><div class="lp-isb" id="ct-isb-inner">'+sbInner+'</div></div>'
    +'</div></div>'
    +(ctStatusModal?buildCtStatusModalHTML():'');
}
function buildApplicableEmpSection(){
  const filterTypes=['Department','Designation','Branch'];
  const typeOpts=apCS('ap-filter-type',filterTypes,apFilterType,'Select Type');
  const valueOpts=apFilterType&&filterData[apFilterType]
    ?apCS('ap-filter-value',filterData[apFilterType],apFilterValue,'Select Value')
    :'<div style="height:42px;display:flex;align-items:center;padding:0 14px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;color:#b0b8c4;background:#f8fafc">Select a type first</div>';
  const filtered=getFilteredAvailEmps();
  const sel=[...selectedEmps].map(id=>empPool.find(e=>e.id===id)).filter(Boolean);
  const availHTML=filtered.length?filtered.map(e=>`<button type="button" class="employee-option" onclick="addApEmp('${e.id}')"><div><div class="employee-name">${e.name}</div><div class="employee-key">${e.key}</div></div><span class="employee-add">+</span></button>`).join(''):'<div class="empty-selection">No employees match the filter.</div>';
  const selHTML=sel.length?sel.map(e=>`<div class="lp-sb-emp-item"><div class="lp-sb-emp-avatar">${e.name[0]}</div><span class="lp-sb-emp-name">${e.name} &mdash; ${e.key}</span><button type="button" class="lp-sb-emp-remove" onclick="removeApEmp('${e.id}')">&times;</button></div>`).join(''):'<div class="empty-selection">No employees added yet.</div>';
  return `<div class="policy-form-section">
    <div class="policy-section-title">Applicable Employees</div>
    <div class="ap-filter-section">
      <div class="ap-filter-row">
        <div class="ap-filter-group"><label class="ep-form-label">Assign By</label>${typeOpts}</div>
        <div class="ap-filter-second"><label class="ep-form-label">Filter Value</label>${valueOpts}</div>
        <button type="button" class="ep-save-btn ap-pill-btn" style="margin-top:18px;min-width:80px" onclick="applyApFilter()">Apply</button>
      </div>
    </div>
    <div class="employee-picker">
      <div class="employee-picker-head">
        <span class="employee-picker-title">Employee Selection</span>
        <span class="employee-picker-count" id="ap-sel-count">${sel.length} Selected</span>
      </div>
      <div class="employee-picker-body">
        <div class="employee-list">
          <div class="employee-list-title">Available</div>
          <div id="ep-avail-emp-list">${availHTML}</div>
        </div>
        <div class="employee-selected">
          <div class="employee-list-title">Selected (${sel.length})</div>
          <div class="ep-emp-tags">${selHTML}</div>
        </div>
      </div>
    </div>
  </div>`;
}
function setApFilterType(val){apFilterType=val;apFilterValue='';renderApEmpLists();}
function applyApFilter(){renderApEmpLists();}
function getFilteredAvailEmps(){
  const already=[...selectedEmps];
  if(!apFilterType||!apFilterValue)return empPool.filter(e=>!already.includes(e.id));
  const fieldMap={Department:'dept',Designation:'desig',Branch:'branch'};
  const field=fieldMap[apFilterType];
  return empPool.filter(e=>{
    const ext=empPoolExt[e.id]||{};
    return !already.includes(e.id)&&(!field||(ext[field]||'').toLowerCase()===apFilterValue.toLowerCase());
  });
}
function renderApEmpLists(){
  const sel=[...selectedEmps].map(id=>empPool.find(e=>e.id===id)).filter(Boolean);
  const filtered=getFilteredAvailEmps();
  const avail=document.getElementById('ep-avail-emp-list');
  const selEl=document.querySelector('.employee-selected .ep-emp-tags');
  const countEl=document.getElementById('ap-sel-count');
  if(avail)avail.innerHTML=filtered.length?filtered.map(e=>`<button type="button" class="employee-option" onclick="addApEmp('${e.id}')"><div><div class="employee-name">${e.name}</div><div class="employee-key">${e.key}</div></div><span class="employee-add">+</span></button>`).join(''):'<div class="empty-selection">No employees match.</div>';
  if(selEl)selEl.innerHTML=sel.length?sel.map(e=>`<div class="lp-sb-emp-item"><div class="lp-sb-emp-avatar">${e.name[0]}</div><span class="lp-sb-emp-name">${e.name} &mdash; ${e.key}</span><button type="button" class="lp-sb-emp-remove" onclick="removeApEmp('${e.id}')">&times;</button></div>`).join(''):'<div class="empty-selection">No employees added yet.</div>';
  if(countEl)countEl.textContent=sel.length+' Selected';
}
function addApEmp(id){selectedEmps.add(id);renderApEmpLists();}
function removeApEmp(id){selectedEmps.delete(id);renderApEmpLists();}
function openEditLeavePolicy(id){leaveEditId=id;page='leave-policy-edit';renderADTPage();}
/* ── Create New Team: a popup, like every other create form ─────────────
   Opens over the Teams listing, or over the Create New Employee popup when
   HR starts a team from there - saving then ticks the new team in that
   employee's form. Only the X / Cancel closes it. */
let tmCreateOpen=false;
function startAddTeam(){
  tmCreateOpen=true;
  const fromEmployee=typeof eaOpen!=='undefined'&&eaOpen;
  if(!fromEmployee&&page!=='teams'){page='teams';syncSidebarDropdown(page);}
  renderADTPage();
  setTimeout(function(){const n=document.getElementById('team-name');if(n)n.focus();},30);
}
function cancelAddTeam(){tmCreateOpen=false;renderADTPage();}
function buildAddTeamModalHTML(){
  if(!tmCreateOpen)return '';
  const departments=['Engineering','Finance','HR','Legal','Operations','Support','Admin'];
  const roles=['Team Lead','Manager','HR Partner','Member','Approver'];
  const members=empPool.map(e=>e.name+' - '+e.key);
  const x='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form tm-modal" role="dialog" aria-modal="true" aria-label="Create New Team" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create New Team</span>'
      +'<button class="ct-modal-close" onclick="cancelAddTeam()" aria-label="Close">'+x+'</button></div>'
    +'<p class="ct-modal-sub">Add team details to your workforce. Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="tm-modal-sec"><div class="tm-modal-sec-title">Basic Detail</div>'
      +'<div class="ep-form-grid">'
        +'<div class="ep-form-group"><label class="ep-form-label" for="team-name">Team Name <span class="req">*</span></label><input class="ep-form-input" id="team-name" type="text" placeholder="Enter team name"></div>'
        +'<div class="ep-form-group"><label class="ep-form-label" for="team-email">Team Email ID <span class="req">*</span></label><input class="ep-form-input" id="team-email" type="email" placeholder="Enter email"></div>'
        +'<div class="ep-form-group"><label class="ep-form-label tm-label">Department <span class="req">*</span><span class="team-form-links"><button type="button" class="team-form-link">+ Add Department</button><button type="button" class="team-form-link muted">Refresh</button></span></label>'
          +apCS('team-department',departments,'','Select Department')+'</div>'
      +'</div></div>'
    +'<div class="tm-modal-sec"><div class="tm-modal-sec-title">Role Assignment<button type="button" class="team-add-members">+ Add Members</button></div>'
      +'<div class="ep-form-grid">'
        +'<div class="ep-form-group"><label class="ep-form-label">Member Role <span class="team-help-dot" tabindex="0" role="img" aria-label="About Member Role" data-tip="The role the selected members will hold in this team. It decides what they can see and approve: Team Lead and Manager run the team, HR Partner handles its people matters, Approver signs off requests, and Member takes part only.">!</span></label>'+apCS('team-role',roles,'','Select')+'</div>'
        +'<div class="ep-form-group"><label class="ep-form-label tm-label">Members Name <span class="team-form-links"><button type="button" class="team-form-link">+ Add Employee</button><button type="button" class="team-form-link muted">Refresh</button></span></label>'
          +apCS('team-member',members,'','Select')+'</div>'
      +'</div></div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="cancelAddTeam()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="submitAddTeam()">Create Team</button>'
    +'</div></div>'
    +'</div></div>';
}
// An untouched select still shows its placeholder as .cs-value text, so return
// '' unless the user actually picked an option (mirrors getCustomSelectValue).
/* WHAT A NATIVE <select id=x> GAVE ITS CALLERS, for the forms that used to
   hold one: read it, flash it, clear it. apCS renders a wrapper with the id
   on #csw-<id> rather than an element carrying the value, so
   document.getElementById(id) finds nothing — these three are what the log
   forms call instead. csTrigger() returns the button, which is what the
   existing red-border flashes and .focus() calls want. */
function csTrigger(id){
  const w=document.getElementById('csw-'+id);
  return w?w.querySelector('.cs-trigger'):null;
}
function csClear(id){
  const t=csTrigger(id);if(!t)return;
  const v=t.querySelector('.cs-value');
  if(v)v.textContent=t.dataset.csph||'';
  t.classList.add('cs-placeholder');
  const d=document.getElementById('csd-'+id);
  if(d)d.querySelectorAll('.cs-option').forEach(function(o){o.classList.remove('cs-selected');});
}
function getCSValue(id){
  const wrap=document.getElementById('csw-'+id);
  if(!wrap)return '';
  const trigger=wrap.querySelector('.cs-trigger');
  if(trigger&&trigger.classList.contains('cs-placeholder'))return '';
  const val=wrap.querySelector('.cs-value');
  return val?val.textContent.trim():'';
}
function submitAddTeam(){
  const name=document.getElementById('team-name');
  const email=document.getElementById('team-email');
  const dept=getCSValue('team-department');
  if(!name||!name.value.trim()){showToast('Please enter a Team Name','error');name&&name.focus();return;}
  if(!email||!email.value.trim()){showToast('Please enter a Team Email ID','error');email&&email.focus();return;}
  if(!dept||dept==='Select Department'){showToast('Please select a Department','error');return;}
  const member=getCSValue('team-member');
  const teamName=name.value.trim();
  const newId=teamsData.length?Math.max.apply(null,teamsData.map(function(t){return t.id;}))+1:1;
  lpLanded('teams',newId);
  teamsData.unshift({id:newId,teamId:String(2880+newId),name:teamName,dept:dept,country:'India',members:member&&member!=='Select'?1:0,email:email.value.trim(),createdBy:'Pallavi Parate',joinDate:'From: '+new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),status:'Active',membersList:member&&member!=='Select'?[{name:member,role:'Member',desig:'--'}]:[]});
  const rows=supportPageMeta.teams.rows;
  rows.unshift([0,teamName,dept,'India',member&&member!=='Select'?'1':'0','Active']);
  rows.forEach(function(r,i){r[0]=i+1;});
  tmCreateOpen=false;
  /* Started from Create New Employee: tick the new team there and go back. */
  const forEmployee=typeof eaOpen!=='undefined'&&eaOpen&&eaData;
  if(forEmployee&&eaData.teams.indexOf(teamName)<0)eaData.teams.push(teamName);
  renderADTPage();
  showToast('Team created','success','"'+teamName+'" has been added to Teams'+(forEmployee?' and selected for this employee.':'.'));
}

/* ══ PAYHEADS ══════════════════════════════════════════════════════════════
   Listing, detail panel and creation page, built on the same parts every other
   module uses: apCS filters + listing-stats above the table, .lp-table in a
   .lp-split-wrap with the .lp-isb-* panel, and an .ep-page form for creation —
   the shape Add Leave Policy already established. Nothing here is a new idea
   about how a module works; only the payhead-specific parts are new. */
function phToggleStatFilter(v){
  phStatusFilter=phStatusFilter===v?'':v;
  phSelectedId=null;renderADTPage();
}
function applyPhFilters(){
  const cat=getCSValue('ph-f-cat'),st=getCSValue('ph-f-status');
  phCategoryFilter=cat&&cat!=='All Categories'?cat:'';
  phStatusFilter=st&&st!=='All Statuses'?st:'';
  phSearchQuery=lpSearchValue('ph-f-q');
  phSelectedId=null;renderADTPage();
}
function resetPhFilters(){phCategoryFilter='';phStatusFilter='';phSearchQuery='';phSelectedId=null;renderADTPage();}

// ── Detail panel ──
function openPhSidebar(id,tab){
  phTab=tab||sbKeepTab(phSelectedId,phTab);phSelectedId=id;
  const sb=document.getElementById('ph-split-sb');if(sb)sb.classList.add('open');
  const wrap=document.getElementById('ph-split-wrap');if(wrap)wrap.classList.add('has-sb');
  isbTab('ph',renderPhSidebar);
  document.querySelectorAll('.ph-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='ph-row-'+id);});
}
function closePhSidebar(){
  phSelectedId=null;
  const sb=document.getElementById('ph-split-sb');if(sb)sb.classList.remove('open');
  const wrap=document.getElementById('ph-split-wrap');if(wrap)wrap.classList.remove('has-sb');
  document.querySelectorAll('.ph-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navPhTab(tab){phTab=tab;isbTab('ph',renderPhSidebar);}
function phCancelLog(){isbTab('ph',renderPhSidebar);}
function phSaveLog(id){
  const p=payheadsData.find(function(x){return x.id===id;});if(!p)return;
  const was=p.status;
  const inp=document.getElementById('ph-log-comment-inp');
  const comment=inp?inp.value.trim():'';
  phSeedLogs(p);
  if(!lpCommitLog(p,'ph-log-status-sel','ph-log-comment-inp',p.logs))return;
  /* A move made in Logs is appended to Workflow too, so the two tabs cannot
     end on different stories. A comment that does not move the status is a log
     entry only — the workflow records stages, not chatter. */
  if(p.status!==was){
    phWorkflow(p);   // seed first, so the new stage sits on top of the history
    wfPush(phWorkflowData,id,p.status==='Active'?'Payhead Activated':'Payhead Deactivated',
      'Moved from '+was+' to '+p.status+'. '+comment);
  }
  renderADTPage();
  showToast('Log added','success','"'+p.name+'" is now '+p.status+'.');
}
/* Derived from the payhead, not written out per record — same reason the
   compliance dashboard derives its history: a hand-typed fixture disagrees
   with the record the first time a status moves in Logs, and a workflow that
   ends on a different state than the panel is showing is worse than none.
   Seeded once, then appended to by phSaveLog, so a move made this session
   stays on the timeline. */
const phWorkflowData={};
function phWorkflow(p){
  if(!phWorkflowData[p.id]){
    const parts=String(p.createdAt).split('|');
    const d=(parts[0]||'').trim(),t=(parts[1]||'').trim()||'09:00:00 AM';
    const n=p.slabs.length;
    phWorkflowData[p.id]=[   // newest first, like every other Workflow tab
      {title:p.status==='Active'?'Payhead Active':'Payhead Deactivated',user:p.createdBy,date:d,time:t,
       description:p.status==='Active'
         ? '"'+p.name+'" is live and will be applied on the next payroll run.'
         : '"'+p.name+'" is inactive and is skipped by payroll.'},
      {title:'Slabs Configured',user:p.createdBy,date:d,time:t,
       description:n+' slab'+(n===1?'':'s')+' defined on '+p.calcOn+' — '+phRuleText(p)+'.'},
      {title:'Payhead Created',user:p.createdBy,date:d,time:t,
       description:p.category+' payhead created by '+p.createdBy+'.'}
    ];
  }
  return phWorkflowData[p.id];
}
function phSeedLogs(p){
  return seedLogs(p,[{date:p.createdAt.split(' | ')[0],time:p.createdAt.split(' | ')[1]||'09:00:00 AM',
    user:p.createdBy,status:p.status,action:'Payhead created with '+p.slabs.length+' slab'+(p.slabs.length===1?'':'s')+'.'}]);
}
// Shared by the panel and the create page's preview, so a slab table always
// reads the same wherever it appears.
function phSlabTableHTML(slabs,calcOn){
  const thS='padding:9px 12px;text-align:left;font-size:10.5px;font-weight:600;color:#6b7280;background:#f8fafc;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap';
  const tdS='padding:10px 12px;font-size:12.5px;color:var(--navy);border-bottom:1px solid #f1f3f5';
  const rows=slabs.map(function(s,i){
    // An empty `to` is not missing data — it is what closes the last band.
    const range=s.to?(s.from+' – '+s.to):(s.from+' and above');
    const val=s.method==='Percentage'?s.value+'%':s.value;
    return '<tr><td style="'+tdS+';color:var(--gray)">'+(i+1)+'</td>'
      +'<td style="'+tdS+';font-weight:600;white-space:nowrap">'+range+'</td>'
      +'<td style="'+tdS+';white-space:nowrap">'+val+'</td>'
      +'<td style="'+tdS+'">'+s.method+'</td></tr>';
  }).join('');
  return '<div class="ph-slab-table-wrap"><table class="ph-slab-table"><thead><tr>'
    +'<th style="'+thS+'">#</th><th style="'+thS+'">Range on '+calcOn+'</th>'
    +'<th style="'+thS+'">Value</th><th style="'+thS+'">Calc Method</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function renderPhSidebar(){
  const p=payheadsData.find(function(x){return x.id===phSelectedId;});if(!p)return'';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'slabs',label:'Slab Configuration'},{id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<div class="lp-isb-tabs" id="ph-isb-tabs">'+tabs.map(function(t){
      return '<button class="lp-isb-tab'+(phTab===t.id?' active':'')+'" onclick="navPhTab(\''+t.id+'\')">'+t.label+'</button>';
    }).join('')+'</div>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closePhSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const iTag='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const iCalc='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="12" y1="11" x2="12.01" y2="11"/><line x1="16" y1="11" x2="16.01" y2="11"/><line x1="8" y1="16" x2="16" y2="16"/></svg>';
  const iUser='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iCheck='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const fc=function(ico,label,val){return '<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';};
  let body='';
  if(phTab==='basic-details'){
    body='<div class="lp-sb-detail-grid">'
      +fc(iTag,'Payhead Name',p.name)+fc(iCheck,'Status',sbStatus(p.status))
      +fc(iTag,'Category',p.category)+fc(iCalc,'Calculation On',p.calcOn)
      +fc(iCalc,'Rule',phRuleText(p))+fc(iTag,'Slabs',String(p.slabs.length))
      +fc(iUser,'Created By',p.createdBy)+fc(iCal,'Created At',p.createdAt)
      +'</div>';
  }else if(phTab==='slabs'){
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Slab Configuration</span></div>'
      +phSlabTableHTML(p.slabs,p.calcOn);
  }else if(phTab==='history'){
    body=sbHistoryHTML(p);
  }else if(phTab==='logs'){
    const logs=phSeedLogs(p);
    const form='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+statusTone(p.status)+'"></span>'+p.status+'</div>'
      +'<p class="lp-logs-form-sub">Move this payhead on and say why</p>'
      +lpLogStatusField('ph-log-status-sel',p.status,['Active','Inactive'])
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="ph-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="ep-cancel-btn" style="flex:1" onclick="phCancelLog()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="phSaveLog('+p.id+')">Submit</button>'
      +'</div></div>';
    body=lpLogsView(logs,form);
  }else{
    // Shared renderer, so it reads like every other Workflow tab.
    body=wfTimelineHTML(wfApproval(p,phWorkflow(p),'Payroll Admin'));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}

// ── Listing ──
function buildPayheadsPageHTML(){
  const dotsIco='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const active=payheadsData.filter(function(p){return p.status==='Active';}).length;
  const inactive=payheadsData.filter(function(p){return p.status==='Inactive';}).length;
  const rows=phRows();
  if(phSelectedId&&!rows.some(function(p){return p.id===phSelectedId;}))phSelectedId=null;
  const pgn=listPage('payheads',phCategoryFilter+'|'+phStatusFilter+'|'+phSearchQuery,lpSearchRows(rows,phSearchQuery).map(function(p,i){
    return '<tr class="ph-row'+(phSelectedId===p.id?' lp-row-selected':'')+'" id="ph-row-'+p.id+'" style="cursor:pointer" onclick="openPhSidebar('+p.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><span style="color:var(--orange);font-weight:500">'+p.name+'</span></td>'
      +'<td>'+p.category+'</td>'
      +'<td>'+p.calcOn+'</td>'
      +'<td>'+phRuleText(p)+'</td>'
      +'<td><span class="lp-status-badge tone-'+statusTone(p.status)+'">'+p.status+'</span></td>'
      +'<td onclick="event.stopPropagation()">'+rowLogCell('payheads',p.id)+'</td>'
      +'</tr>';
  }),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No payheads match this filter.</td></tr>');
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('ph-f-q',phSearchQuery,'Search payhead','applyPhFilters()')
    +apCS('ph-f-cat',PH_CATEGORIES,phCategoryFilter,'All Categories')
    +apCS('ph-f-status',['Active','Inactive'],phStatusFilter,'All Statuses')
    +clearFiltersBtn([phCategoryFilter,phStatusFilter,phSearchQuery],'resetPhFilters()')
    +'<button class="lp-pill-search" onclick="applyPhFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'
    +'<div class="listing-stat'+(phStatusFilter==='Active'?' stat-selected':'')+'" onclick="phToggleStatFilter(\'Active\')"><div class="listing-stat-count" style="color:var(--st-ok-fg)">'+active+'</div><div class="listing-stat-label">Active</div></div>'
    +'<div class="listing-stat'+(phStatusFilter==='Inactive'?' stat-selected':'')+'" onclick="phToggleStatFilter(\'Inactive\')"><div class="listing-stat-count" style="color:var(--st-idle-fg)">'+inactive+'</div><div class="listing-stat-label">Inactive</div></div>'
    +'</div></div>'
    +'<div class="lp-split-wrap" style="margin-top:14px" id="ph-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr><th>S. No</th><th>Payhead</th><th>Category</th><th>Calculation On</th><th>Rule</th><th>Status</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(phSelectedId?' open':'')+'" id="ph-split-sb"><div class="lp-isb" id="ph-isb-inner">'+(phSelectedId?sbRender(renderPhSidebar,'ph'):'')+'</div></div>'
    +'</div></div>'
    +(phModalOpen?buildCreatePayheadModalHTML():'');
}

/* ── Create page ───────────────────────────────────────────────────────────
   THE SLAB ROWS ARE STATE, NOT MARKUP. Add Slab repaints the block, so what
   the user has already typed has to be read back into phDraftSlabs first or it
   would be wiped by the row they just asked for. Every field writes straight
   through on input for the same reason.

   FROM VALUE IS DERIVED, NEVER TYPED. Each band starts where the previous one
   ended, so it is rendered read-only and recomputed whenever a To Value
   changes. That is the whole reason the table cannot develop a gap or an
   overlap — the two failure modes a hand-typed slab table always eventually
   has. The first band starts at 0 and the last one has no end: an empty To
   Value means "and above", which is what closes the range. */
function phBlankSlab(){return {from:'0',to:'',value:'',method:''};}
function startAddPayhead(){
  phDraftSlabs=[phBlankSlab()];phModalOpen=true;renderADTPage();
}
function cancelAddPayhead(){phDraftSlabs=[];phModalOpen=false;renderADTPage();}
// Read the DOM back into state before any repaint.
function phSyncSlabs(){
  phDraftSlabs.forEach(function(s,i){
    const to=document.getElementById('ph-slab-to-'+i);
    const val=document.getElementById('ph-slab-val-'+i);
    if(to)s.to=to.value.trim();
    if(val)s.value=val.value.trim();
    s.method=getCustomSelectValue('ph-slab-m-'+i)||s.method;
  });
  phChainFrom();
}
function phChainFrom(){
  phDraftSlabs.forEach(function(s,i){
    s.from=i===0?'0':(phDraftSlabs[i-1].to||'0');
  });
}
/* Adding or removing a band repaints ONLY the slab list. renderADTPage() would
   rebuild the modal around it, wiping the Name field and both selects above —
   fields the user filled in before they got to the slabs. Same principle as
   pmSetUserSubTab(): repaint the part that changed, not its ancestors. */
function phRenderSlabs(){
  const list=document.getElementById('ph-slab-list');
  if(!list){renderADTPage();return;}
  phChainFrom();
  list.innerHTML=phSlabRowsHTML();
}
function phAddSlab(){phSyncSlabs();phDraftSlabs.push(phBlankSlab());phRenderSlabs();}
function phRemoveSlab(i){
  phSyncSlabs();
  if(phDraftSlabs.length<=1)return;      // a payhead with no rule is not a payhead
  phDraftSlabs.splice(i,1);phRenderSlabs();
}
// The one field the user types that others depend on, so it re-chains live.
function phSlabToChanged(){
  phSyncSlabs();
  phDraftSlabs.forEach(function(s,i){
    const el=document.getElementById('ph-slab-from-'+i);
    if(el)el.value=s.from;
  });
}
// Split out so phRenderSlabs() can repaint just this list without rebuilding
// the modal that holds it.
function phSlabRowsHTML(){
  const iInfo='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  const iTrash='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
  return phDraftSlabs.map(function(s,i){
    const last=i===phDraftSlabs.length-1;
    const only=phDraftSlabs.length===1;
    return '<div class="ph-slab-row">'
      +'<div class="ep-form-group"><label class="ep-form-label">From Value</label>'
        +'<input class="ep-form-input" id="ph-slab-from-'+i+'" value="'+attrSafe(s.from)+'" readonly '
        +'title="Starts where the previous slab ends"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">To Value '
        +'<span class="ph-hint" title="Leave the last slab empty to mean &quot;and above&quot;">'+iInfo+'</span></label>'
        +'<input class="ep-form-input" id="ph-slab-to-'+i+'" type="number" min="0" value="'+attrSafe(s.to)+'" '
        +'placeholder="'+(last?'and above':'To')+'" oninput="phSlabToChanged()"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Value <span class="req">*</span></label>'
        +'<input class="ep-form-input" id="ph-slab-val-'+i+'" type="number" min="0" step="0.01" value="'+attrSafe(s.value)+'" placeholder="Value"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Calc Method <span class="req">*</span></label>'
        +customSelect('ph-slab-m-'+i,s.method,PH_METHODS,'Select Method')+'</div>'
      +'<button class="ph-slab-del" onclick="phRemoveSlab('+i+')" title="'
        +(only?'A payhead needs at least one slab':'Remove this slab')+'"'+(only?' disabled':'')+'>'+iTrash+'</button>'
      +'</div>';
  }).join('');
}
/* Same popup every other creation form uses — .ct-modal-overlay / .ct-modal,
   .ep-form-grid inside, Cancel and the primary action on one right-aligned
   row. It was briefly built as its own page; a create form is a create form,
   and having one of them behave differently was the only thing that made it
   feel like a different app. Only the width differs, because a slab row is
   five controls wide and 560px would stack them into unreadable columns. */
function buildCreatePayheadModalHTML(){
  if(!phDraftSlabs.length)phDraftSlabs=[phBlankSlab()];
  phChainFrom();
  const xSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create Payhead</span>'
      +'<button class="ct-modal-close" onclick="cancelAddPayhead()">'+xSvg+'</button></div>'

    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Name <span class="req">*</span></label>'
      +'<input type="text" class="ep-form-input" id="ph-new-name" placeholder="Payhead Name"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Category <span class="req">*</span></label>'
      +customSelect('ph-new-cat','',PH_CATEGORIES,'Select Category')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Calculation On <span class="req">*</span></label>'
      +customSelect('ph-new-calc','',PH_CALC_ON,'Select Calculation Type')+'</div>'
    +'</div>'

    +'<div class="ep-form-card ph-slab-card">'
    +'<div class="ph-slab-head">'
      +'<span class="ep-form-title">Slab Configuration</span>'
      +'<button class="ph-add-slab" onclick="phAddSlab()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Slab</button>'
    +'</div>'
    +'<div class="ph-slab-body" id="ph-slab-list">'+phSlabRowsHTML()+'</div>'
    +'</div>'

    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
    +'<button class="ep-cancel-btn" onclick="cancelAddPayhead()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="submitAddPayhead()">Create Payhead</button>'
    +'</div></div>'
    +'</div></div>';
}
function submitAddPayhead(){
  phSyncSlabs();
  const nameEl=document.getElementById('ph-new-name');
  const name=nameEl?nameEl.value.trim():'';
  const cat=getCustomSelectValue('ph-new-cat'),calc=getCustomSelectValue('ph-new-calc');
  if(!name){showToast('Please enter a Payhead Name','error');nameEl&&nameEl.focus();return;}
  if(!cat){showToast('Please select a Category','error');return;}
  if(!calc){showToast('Please select a Calculation On','error');return;}
  /* Validated per slab rather than once at the end, so the message can name
     WHICH band is wrong — "slab 3" is actionable, "check your slabs" is not. */
  for(let i=0;i<phDraftSlabs.length;i++){
    const s=phDraftSlabs[i],n=i+1;
    if(s.value===''){showToast('Slab '+n+' has no Value','error');return;}
    if(!s.method){showToast('Slab '+n+' has no Calc Method','error');return;}
    if(s.to!==''&&parseFloat(s.to)<=parseFloat(s.from)){
      showToast('Slab '+n+' ends before it starts','error','To Value must be above '+s.from+'.');return;}
    if(s.to===''&&i<phDraftSlabs.length-1){
      showToast('Slab '+n+' has no To Value','error','Only the last slab can be open-ended.');return;}
    if(s.method==='Percentage'&&parseFloat(s.value)>100){
      showToast('Slab '+n+' is over 100%','error','A percentage of '+calc+' cannot exceed 100.');return;}
  }
  const now=new Date();
  const stamp=now.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
    +' | '+now.toLocaleTimeString('en-US',{hour12:true});
  lpLanded('payheads',payheadNextId);
  payheadsData.unshift({id:payheadNextId++,name:name,category:cat,calcOn:calc,status:'Active',
    createdBy:CURRENT_USER,createdAt:stamp,slabs:phDraftSlabs.slice(),logs:[]});
  phDraftSlabs=[];
  page='payheads';renderADTPage();
  showToast('Payhead created','success','"'+name+'" added as an active '+cat.toLowerCase()+'.');
}

/* ══ HOLIDAYS ══════════════════════════════════════════════════════════════
   Listing, detail panel and creation popup, built out of the same parts every
   other module uses — apCS filters + listing-stats above the table, .lp-table
   in a .lp-split-wrap with the .lp-isb-* panel behind the row action, and a
   .ct-modal popup for creation. Nothing here is a new idea about how a module
   works; only the holiday-specific parts are new.

   THE ONE THING THAT IS DIFFERENT IS THE CREATE FORM, and it is different
   because the work is different. Every other create form in the app files ONE
   record: one payhead, one team, one rate. A holiday calendar is not filed one
   record at a time — it is published, a dozen dates in one sitting, once a
   year. A popup that takes one holiday and closes would be opened twelve times
   for the same piece of work. So the popup takes a LIST: one row per holiday,
   each with its own name, added and removed in place, saved as a batch. */

const HD_TYPE_TONE={'Public Holiday':'ok','Optional Holiday':'info','Company Holiday':'idle'};
/* The column is called Type inside a table whose subject is already holidays,
   so the pill says "Public", not "Public Holiday" — the second word is the
   table's own heading repeated on every row. The panel spells it out in full,
   where there is room and nothing to repeat. */
function hdTypeBadge(t){
  return '<span class="lp-status-badge tone-'+(HD_TYPE_TONE[t]||'idle')+'" style="min-width:0">'
    +String(t||'—').replace(/ Holiday$/,'')+'</span>';
}
/* "26 Jan 2026" answers WHEN; it does not answer HOW SOON, which is the thing
   anyone opening a holiday calendar in August actually wants to know. */
function hdDaysAway(iso){
  const d=cdParse(iso),t=cdParse(hdTodayISO());
  if(!d||!t)return '';
  const n=Math.round((d-t)/86400000);
  if(n===0)return 'Today';
  if(n===1)return 'Tomorrow';
  if(n===-1)return 'Yesterday';
  if(n>0)return n<31?('In '+n+' days'):('In '+Math.round(n/30)+' month'+(Math.round(n/30)===1?'':'s'));
  const a=Math.abs(n);
  return a<31?(a+' days ago'):(Math.round(a/30)+' month'+(Math.round(a/30)===1?'':'s')+' ago');
}

// ── Filters ──
function hdToggleStatFilter(v){
  hdStatusFilter=hdStatusFilter===v?'':v;
  hdSelectedId=null;renderADTPage();
}
/* Upcoming is not a status, so it cannot ride on hdStatusFilter — a calendar
   can be filtered to "Active AND still to come", and folding the two into one
   variable would make those mutually exclusive. */
function hdToggleUpcoming(){
  hdUpcomingOnly=!hdUpcomingOnly;
  hdSelectedId=null;renderADTPage();
}
function applyHdFilters(){
  const y=getCSValue('hd-f-year'),t=getCSValue('hd-f-type'),b=getCSValue('hd-f-branch');
  hdYearFilter=y&&y!=='All Years'?y:'';
  hdTypeFilter=t&&t!=='All Types'?t:'';
  hdBranchFilter=b&&b!=='Every Branch'?b:'';
  hdSearchQuery=lpSearchValue('hd-f-q');
  hdSelectedId=null;renderADTPage();
}
function resetHdFilters(){
  hdYearFilter='';hdTypeFilter='';hdBranchFilter='';hdStatusFilter='';hdSearchQuery='';hdUpcomingOnly=false;
  hdSelectedId=null;renderADTPage();
}

// ── Detail panel ──
function openHdSidebar(id,tab){
  if(hdSelectedId!=null&&String(hdSelectedId)!==String(id)&&sbLeaveGuard('hd',function(){openHdSidebar(id,tab);}))return;
  hdTab=tab||sbKeepTab(hdSelectedId,hdTab);hdSelectedId=id;hdEditMode=false;
  const sb=document.getElementById('hd-split-sb');if(sb)sb.classList.add('open');
  const wrap=document.getElementById('hd-split-wrap');if(wrap)wrap.classList.add('has-sb');
  isbTab('hd',renderHdSidebar);
  document.querySelectorAll('.hd-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='hd-row-'+id);});
}
function closeHdSidebar(){if(sbLeaveGuard('hd',closeHdSidebar))return;
  hdSelectedId=null;hdEditMode=false;
  const sb=document.getElementById('hd-split-sb');if(sb)sb.classList.remove('open');
  const wrap=document.getElementById('hd-split-wrap');if(wrap)wrap.classList.remove('has-sb');
  document.querySelectorAll('.hd-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navHdTab(tab){hdTab=tab;if(!sbHasDraft('hd'))hdEditMode=false;isbTab('hd',renderHdSidebar);}
/* The tab strip is unchanged between the two modes, so isbTab swaps only the
   body — the tabs keep their identity and the panel does not flash. */
function hdSetEdit(on){
  hdPickClose();
  hdEditMode=!!on;
  // The picker edits a working copy of this record's audience, seeded when the
  // form opens and read back by saveHdEdit. Cancel simply never reads it.
  if(hdEditMode){
    const h=holidaysData.find(function(x){return x.id===hdSelectedId;});
    hdPickState.sb=h?hdBranches(h):[];
  }
  isbTab('hd',renderHdSidebar);
}
/* WHAT EDIT DOES NOT TOUCH: the entity, and the status.

     The entity, because a holiday moved to another entity's calendar is not
     an edit, it is a different holiday — and the create popup already refuses
     to ask the question for the same reason.

     The status, because moving it is what the Logs tab is for, and moving it
     there is what attaches a comment to the move. Offering it here as well
     would be a second way to deactivate a holiday that leaves no trace of why,
     and the two would disagree the first time anyone used this one. */
function saveHdEdit(){
  const h=holidaysData.find(function(x){return x.id===hdSelectedId;});if(!h)return;
  const nameEl=document.getElementById('hdsb-name');
  const name=nameEl?nameEl.value.trim():'';
  const date=getCDValue('hdsb-date');
  const type=getCustomSelectValue('hdsb-type');
  const branches=hdPickGet('sb').slice();
  const recEl=document.getElementById('hdsb-rec');
  const rec=recEl?recEl.checked:h.recurring;
  if(!name){showToast('Holiday name is required','error');if(nameEl)nameEl.focus();return;}
  if(!date){showToast('Date is required','error','Pick the day this holiday falls on.');return;}
  if(!type){showToast('Type is required','error','Pick Public, Optional or Company.');return;}
  /* Same clash rule the create popup enforces, minus this record itself —
     without the id check, saving a holiday without moving it would report a
     clash against itself. */
  const clash=holidaysData.find(function(x){
    return x.id!==h.id&&x.entity===h.entity&&x.status==='Active'&&x.date===date
      &&hdAudienceOverlap(hdBranches(x),branches);
  });
  if(clash){showToast(hdDateLabel(date)+' is already a holiday','error',
    '"'+clash.name+'" is on the '+h.entity+' calendar for that date.');return;}
  /* Collected BEFORE the record is written, so the workflow entry can say what
     actually moved rather than just "edited". */
  const changes=[];
  if(h.name!==name)changes.push('renamed from "'+h.name+'"');
  if(h.date!==date)changes.push('moved from '+hdDateLabel(h.date)+' to '+hdDateLabel(date));
  if(h.type!==type)changes.push('type changed from '+h.type+' to '+type);
  const wasBr=hdBranches(h);
  if(wasBr.join('|')!==branches.join('|'))
    changes.push('now applies to '+hdBranchText({branches:branches})+' (was '+hdBranchText({branches:wasBr})+')');
  if(h.recurring!==rec)changes.push(rec?'now repeats every year':'no longer repeats yearly');
  if(!changes.length){hdSetEdit(false);showToast('No changes','info','Nothing was different.');return;}
  h.name=name;h.date=date;h.type=type;h.branches=branches;h.recurring=rec;
  delete h.branch;   // the old single-branch field is gone for good on this record
  hdWorkflow(h);   // seed first, so the edit sits on top of the history
  wfPush(hdWorkflowData,h.id,'Holiday Edited',changes.join('; ')+'.');
  hdEditMode=false;
  renderADTPage();   // the date may have moved the row, so the list is rebuilt
  showToast('Holiday updated','success','"'+h.name+'" is on '+hdDateLabel(h.date)+'.');
}
function hdCancelLog(){isbTab('hd',renderHdSidebar);}
function hdSeedLogs(h){
  const parts=String(h.createdAt).split(' | ');
  return seedLogs(h,[{date:parts[0],time:parts[1]||'09:00:00 AM',user:h.createdBy,status:h.status,
    action:'"'+h.name+'" added to the '+h.entity+' calendar for '+hdDateLabel(h.date)+'.'}]);
}
/* Derived from the record rather than written out per holiday, for the reason
   every other module derives its timeline: a hand-typed fixture disagrees with
   the record the first time a status moves in Logs, and a Workflow tab that
   ends on a different state than the panel is showing is worse than none.
   Seeded once, then appended to by hdSaveLog, so a move made this session
   stays on the timeline. */
const hdWorkflowData={};
function hdWorkflow(h){
  if(!hdWorkflowData[h.id]){
    const parts=String(h.createdAt).split('|');
    const d=(parts[0]||'').trim(),t=(parts[1]||'').trim()||'09:00:00 AM';
    hdWorkflowData[h.id]=[   // newest first, like every other Workflow tab
      {title:h.status==='Active'?'Holiday Published':'Holiday Withdrawn',user:h.createdBy,date:d,time:t,
       description:h.status==='Active'
         ? '"'+h.name+'" is live on the '+h.entity+' calendar — attendance and payroll treat '+hdDateLabel(h.date)+' as a non-working day.'
         : '"'+h.name+'" is withdrawn — '+hdDateLabel(h.date)+' is treated as an ordinary working day again.'},
      {title:'Calendar Entry Configured',user:h.createdBy,date:d,time:t,
       description:h.type+' set for '+hdDateLabel(h.date)+' ('+hdDayName(h.date)+')'
         +(h.recurring?', repeating every year.':', for this year only.')},
      {title:'Holiday Added',user:h.createdBy,date:d,time:t,
       description:'"'+h.name+'" added to the '+h.entity+' holiday calendar by '+h.createdBy+'.'}
    ];
  }
  return hdWorkflowData[h.id];
}
function hdSaveLog(id){
  const h=holidaysData.find(function(x){return x.id===id;});if(!h)return;
  const was=h.status;
  const inp=document.getElementById('hd-log-comment-inp');
  const comment=inp?inp.value.trim():'';
  hdSeedLogs(h);
  if(!lpCommitLog(h,'hd-log-status-sel','hd-log-comment-inp',h.logs))return;
  /* A move made in Logs is appended to Workflow too, so the two tabs cannot
     end on different stories. A comment that does not move the status is a log
     entry only — the workflow records stages, not chatter. */
  if(h.status!==was){
    hdWorkflow(h);   // seed first, so the new stage sits on top of the history
    wfPush(hdWorkflowData,id,h.status==='Active'?'Holiday Published':'Holiday Withdrawn',
      'Moved from '+was+' to '+h.status+'. '+comment);
  }
  renderADTPage();
  showToast('Log added','success','"'+h.name+'" is now '+h.status+'.');
}
/* The holiday's header card - the same in the details view and while editing.
   The chip is tinted by TYPE, the same colour its badge carries, so the date
   block and the badge across the header read as one record rather than two
   unrelated marks. */
function hdHeroHTML(h,editing){
  const upcoming=hdIsUpcoming(h)&&h.status==='Active';
  const off=h.status!=='Active';
  const d=cdParse(h.date);
  return '<div class="hd-sb-hero'+(upcoming?' is-next':'')+(off?' is-off':'')+'">'
    +'<div class="hd-sb-datechip tone-'+(HD_TYPE_TONE[h.type]||'idle')+'"><span class="hd-sb-dc-day">'+(d?d.getDate():'—')+'</span>'
      +'<span class="hd-sb-dc-mon">'+(d?CD_MON_SHORT[d.getMonth()]+' '+hdYearOf(h.date):'')+'</span></div>'
    +'<div class="hd-sb-hero-text"><div class="hd-sb-hero-name">'+h.name+'</div>'
    +'<div class="hd-sb-hero-meta">'+hdDayName(h.date)
      +(hdIsWeekend(h.date)?'<span class="hd-weekend-chip" title="Falls on a weekend — no working day is lost">Weekend</span>':'')
      +'<span class="hd-sb-dot">•</span>'+hdDaysAway(h.date)+'</div></div>'
    +'<div class="hd-sb-hero-right">'
      +'<div class="hd-sb-badges">'+hdTypeBadge(h.type)
        +'<span class="lp-status-badge tone-'+statusTone(h.status)+'">'+h.status+'</span></div>'
      +(editing?SB_EDITING_TAG:'<button class="lp-sb-view-edit-btn" onclick="hdSetEdit(true)">'+SB_PEN+' Edit</button>')
    +'</div>'
    +'</div>';
}

function renderHdSidebar(){
  const h=holidaysData.find(function(x){return x.id===hdSelectedId;});if(!h)return'';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  const chevL='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>';
  const chevR='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'hd-isb-tabs\')" title="Scroll left">'+chevL+'</button>'
    +'<div class="lp-isb-tabs" id="hd-isb-tabs">'+tabs.map(function(t){
      return '<button class="lp-isb-tab'+(hdTab===t.id?' active':'')+'" onclick="navHdTab(\''+t.id+'\')">'+t.label+'</button>';
    }).join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'hd-isb-tabs\')" title="Scroll right">'+chevR+'</button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeHdSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const iCal='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iRepeat='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
  const iPin='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  const iBuild='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="7" x2="9.01" y2="7"/><line x1="15" y1="7" x2="15.01" y2="7"/><line x1="9" y1="12" x2="9.01" y2="12"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="9" y1="17" x2="15" y2="17"/></svg>';
  const iUser='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const fc=function(ico,label,val){return '<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';};
  let body='';
  if(hdTab==='basic-details'&&hdEditMode){
    body=hdHeroHTML(h,true)
      +'<div class="lp-sb-edit-form"><div class="lp-sb-edit-section"><div class="lp-sb-form-grid">'
      +'<div class="lp-sb-field" style="grid-column:1/-1"><label>Holiday Name <span class="req">*</span></label>'
        +'<input class="ep-form-input" id="hdsb-name" value="'+attrSafe(h.name)+'" placeholder="e.g. Republic Day"></div>'
      +'<div class="lp-sb-field"><label>Date <span class="req">*</span></label>'
        +apCD('hdsb-date',h.date,'Select date')+'</div>'
      +'<div class="lp-sb-field"><label>Type <span class="req">*</span></label>'
        +customSelect('hdsb-type',h.type,HD_TYPES,'Select Type')+'</div>'
      +'<div class="lp-sb-field"><label>Applies to</label>'
        +hdBranchPickerHTML('sb')+'</div>'
      +'<div class="lp-sb-field"><label>Repeats</label>'
        +'<label class="hd-check" style="justify-content:flex-start" title="Recurs on the same date every year">'
        +'<input type="checkbox" id="hdsb-rec"'+(h.recurring?' checked':'')+'><span>Repeats every year</span></label></div>'
      +'</div>'
      +'<p class="hd-edit-note">Entity and status are not changed here — a status move belongs in <b>Logs</b>, where it carries a comment.</p>'
      +'<div class="lp-sb-form-actions">'
      +'<button class="ep-cancel-btn" onclick="hdSetEdit(false)">Cancel</button>'
      +'<button class="ep-save-btn" onclick="saveHdEdit()">Save changes</button>'
      +'</div></div></div>';
  }else if(hdTab==='basic-details'){
    /* The header states the date the way a calendar does — the day, the date,
       and how far off it is — because that is the whole record. The grid below
       is the metadata; this is the fact. */
    const off=h.status!=='Active';
    body=hdHeroHTML(h,false)
      /* "Inactive" names a state without saying what it costs. A withdrawn
         holiday means people work that day, which is the part anyone reading
         this panel actually needs, so it is said rather than inferred. */
      +(off?'<div class="hd-sb-note">Withdrawn — '+hdDateLabel(h.date)+' is treated as an ordinary working day.</div>':'')
      +'<div class="lp-sb-detail-grid">'
      +fc(iBuild,'Entity',h.entity)
      +fc(iPin,'Applies to',hdBranchChipsHTML(h,4))
      +fc(iRepeat,'Repeats',h.recurring?'Every year':'One-off')
      +fc(iUser,'Created By',h.createdBy)
      +fc(iCal,'Created At',h.createdAt)
      +'</div>';
  }else if(hdTab==='history'){
    body=sbHistoryHTML(h);
  }else if(hdTab==='logs'){
    const logs=hdSeedLogs(h);
    const form='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+statusTone(h.status)+'"></span>'+h.status+'</div>'
      +'<p class="lp-logs-form-sub">Move this holiday on and say why</p>'
      +lpLogStatusField('hd-log-status-sel',h.status,['Active','Inactive'])
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="hd-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="ep-cancel-btn" style="flex:1" onclick="hdCancelLog()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="hdSaveLog('+h.id+')">Submit</button>'
      +'</div></div>';
    body=lpLogsView(logs,form);
  }else{
    // Shared renderer, so it reads like every other Workflow tab.
    body=wfTimelineHTML(wfApproval(h,hdWorkflow(h),'HR'));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}

// ── Listing ──
function buildHolidaysPageHTML(){
  const dotsIco='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const all=hdEntityRows();
  const active=all.filter(function(h){return h.status==='Active';}).length;
  const inactive=all.filter(function(h){return h.status==='Inactive';}).length;
  const upcoming=all.filter(function(h){return h.status==='Active'&&hdIsUpcoming(h);}).length;
  const nextId=hdNextUpId();
  const rows=hdRows();
  if(hdSelectedId&&!rows.some(function(h){return h.id===hdSelectedId;}))hdSelectedId=null;
  const pgn=listPage('holidays',[hdYearFilter,hdTypeFilter,hdBranchFilter,hdStatusFilter,hdUpcomingOnly?'up':'',hdCurrentEntityName(),hdSearchQuery].join('|'),
    lpSearchRows(rows,hdSearchQuery).map(function(h,i){
      return '<tr class="hd-row'+(hdSelectedId===h.id?' lp-row-selected':'')+'" id="hd-row-'+h.id+'" style="cursor:pointer" onclick="openHdSidebar('+h.id+')">'
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><span style="color:var(--orange);font-weight:500">'+h.name+'</span>'
          +(h.id===nextId?'<span class="hd-next-chip" title="The next holiday coming up">Next</span>':'')+'</td>'
        /* Date and its weekday in one cell; Repeats is on the panel. */
        +'<td style="white-space:nowrap"><div class="lp-c-plain">'+hdDateLabel(h.date)+'</div><div class="lp-c-sub">'+(hdDayName(h.date)||'—')
          +(hdIsWeekend(h.date)?'<span class="hd-weekend-chip" title="Falls on a weekend — no working day is lost">Weekend</span>':'')+'</div></td>'
        +'<td>'+hdTypeBadge(h.type)+'</td>'
        // Entity-wide recedes, named branches carry weight — the cell answers
        // "is this one mine?" before it answers "which offices".
        +'<td>'+hdBranchChipsHTML(h)+'</td>'
        +'<td><span class="lp-status-badge tone-'+statusTone(h.status)+'">'+h.status+'</span></td>'
        +'<td onclick="event.stopPropagation()">'+rowLogCell('holidays',h.id)+'</td>'
        +'</tr>';
    }),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No holidays match this filter.</td></tr>');
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('hd-f-q',hdSearchQuery,'Search holiday','applyHdFilters()')
    +apCS('hd-f-year',hdYearOptions(),hdYearFilter,'All Years')
    +apCS('hd-f-type',HD_TYPES,hdTypeFilter,'All Types')
    +apCS('hd-f-branch',hdBranchOptions(),hdBranchFilter,'Every Branch')
    +clearFiltersBtn([hdYearFilter,hdTypeFilter,hdBranchFilter,hdStatusFilter,hdSearchQuery,hdUpcomingOnly?'Upcoming':''],'resetHdFilters()')
    +'<button class="lp-pill-search" onclick="applyHdFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'
    +'<div class="listing-stat'+(hdUpcomingOnly?' stat-selected':'')+'" onclick="hdToggleUpcoming()" title="Holidays still to come"><div class="listing-stat-count" style="color:var(--st-info-fg)">'+upcoming+'</div><div class="listing-stat-label">Upcoming</div></div>'
    +'<div class="listing-stat'+(hdStatusFilter==='Active'?' stat-selected':'')+'" onclick="hdToggleStatFilter(\'Active\')"><div class="listing-stat-count" style="color:var(--st-ok-fg)">'+active+'</div><div class="listing-stat-label">Active</div></div>'
    +'<div class="listing-stat'+(hdStatusFilter==='Inactive'?' stat-selected':'')+'" onclick="hdToggleStatFilter(\'Inactive\')"><div class="listing-stat-count" style="color:var(--st-idle-fg)">'+inactive+'</div><div class="listing-stat-label">Inactive</div></div>'
    +'</div></div>'
    +'<div class="lp-split-wrap" style="margin-top:14px" id="hd-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table" style="min-width:880px"><thead><tr><th>S. No</th><th>Holiday</th><th>Date</th><th>Type</th><th>Applies To</th><th>Status</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(hdSelectedId?' open':'')+'" id="hd-split-sb"><div class="lp-isb" id="hd-isb-inner">'+(hdSelectedId?sbRender(renderHdSidebar,'hd'):'')+'</div></div>'
    +'</div></div>'
    +(hdModalOpen?buildAddHolidaysModalHTML():'');
}

/* ── Create popup: a LIST of holidays, not one ─────────────────────────────
   THE ROWS ARE STATE, NOT MARKUP. Add Holiday repaints the block, so anything
   already typed has to be read back into hdDraftRows first (hdSyncRows) or the
   row the user just asked for would wipe the ones above it. Same principle as
   the payhead slab list — and the same reason the repaint is scoped to
   #hd-row-list rather than going through renderADTPage(): rebuilding the modal
   would clear everything above the rows.

   DAY IS DERIVED, NEVER TYPED. Picking a date fills the Day field in and, if
   the date lands on a Saturday or Sunday, says so under the row — a holiday on
   a weekend costs the entity no working day, and that is worth knowing BEFORE
   it is published, not after somebody asks why the leave balance did not move. */
/* ── Showing who a holiday is for ─────────────────────────────────────────
   Two shapes, one idea. CHIPS state an audience that is already decided — the
   listing cell and the detail panel. The PICKER is the same statement made
   editable: a trigger that reads like the chips do, and a popover of branches
   with ticks.

   Entity-wide is deliberately not drawn as "every branch ticked". It is one
   quiet chip, because it is the default and the common case, and a row of five
   ticked boxes would make the ordinary holiday look like the complicated one. */
/* ONE LINE, WHATEVER THE COUNT. Two chips side by side wrapped in a table cell
   this narrow, and a wrapped cell makes its whole row taller than every other
   row on the page — one holiday observed in two offices should not restripe the
   table. So the cell names the first office and counts the rest; the full list
   is on the cell itself, and the panel (which has the width) shows them all.

   The count chip is not "+1" hanging off the end — it reads "+1 more" nowhere,
   it just carries the number, and the title says what the number is. */
function hdBranchChipsHTML(h,max){
  const list=hdBranches(h);
  if(!list.length)return '<span class="hd-br-chip is-all">'+HD_ALL_BRANCHES+'</span>';
  const cap=Math.max(1,max||1),shown=list.slice(0,cap);
  const title=list.length===1?list[0]:('Applies to '+list.join(', '));
  return '<span class="hd-br-chips" title="'+attrSafe(title)+'">'
    +shown.map(function(b){return '<span class="hd-br-chip">'+b+'</span>';}).join('')
    +(list.length>cap?'<span class="hd-br-chip is-more">+'+(list.length-cap)+'</span>':'')
    +'</span>';
}
const HD_BP_ICO={
  pin:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  chev:'<svg class="hd-bp-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg>',
  tick:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
};
function hdBranchPickerHTML(key){
  const list=hdPickGet(key);
  return '<div class="hd-bp">'
    +'<button type="button" class="hd-bp-btn'+(list.length?'':' is-all')+'" id="hd-bp-btn-'+key+'"'
      +' aria-expanded="false" aria-haspopup="true"'
      +' title="'+attrSafe(list.length?('Applies to '+list.join(', ')):'Applies to every branch of this entity')+'"'
      +' onclick="hdPickToggle(\''+key+'\',event)">'
      +HD_BP_ICO.pin+'<span class="hd-bp-lbl">'+hdBranchLabel(list)+'</span>'+HD_BP_ICO.chev
    +'</button></div>';
}
function hdPickPopHTML(key){
  const list=hdPickGet(key);
  const opt=function(b,label,on){
    return '<button type="button" class="hd-bp-opt'+(on?' is-on':'')+'" data-branch="'+attrSafe(b)+'"'
      +' onclick="'+(b===''?'hdPickAll(\''+key+'\',event)':'hdPickBranch(\''+key+'\',\''+attrSafe(b)+'\',event)')+'">'
      +'<span class="hd-bp-box">'+HD_BP_ICO.tick+'</span><span>'+label+'</span></button>';
  };
  const branches=hdBranchChoices();
  return '<div class="hd-bp-pop" id="hd-bp-pop-'+key+'" onclick="event.stopPropagation()">'
    +'<div class="hd-bp-head">Applies to</div>'
    +opt('',HD_ALL_BRANCHES,!list.length)
    +'<div class="hd-bp-sep"></div>'
    +(branches.length
      ?branches.map(function(b){return opt(b,b,list.indexOf(b)>-1);}).join('')
      :'<div class="hd-bp-empty">No branches on this entity yet.</div>')
    +'<div class="hd-bp-note">'+(list.length
      ?'Only '+list.join(', ')+' will see this holiday.'
      :'Every branch of this entity will see this holiday.')+'</div>'
    +(key.charAt(0)==='r'&&hdDraftRows.length>1
      ?'<button type="button" class="hd-bp-apply" onclick="hdPickApplyAll(\''+key+'\',event)">Apply to all rows</button>'
      :'')
    +'</div>';
}
// A new row starts where the last one left off: a batch is usually for one
// audience, and re-picking it on every row would be the fastest way to end up
// with a row nobody meant to publish entity-wide.
function hdBlankRow(prev){
  return {name:'',date:'',type:'',recurring:true,branches:prev&&prev.branches?prev.branches.slice():[]};
}
/* THE ENTITY IS NOT A QUESTION. Which calendar a holiday goes on is already
   decided by the entity being worked in — the one named in the topbar switcher
   — so the popup states it rather than asking. Offering it as a field would be
   offering a second, quieter way to change entity that disagrees with the
   switcher the moment the two are set differently, and a holiday filed against
   the wrong entity is invisible until somebody works a day the calendar said
   was off. Switching entity is one action, in one place, and it is not here. */
function startAddHoliday(){
  hdDraftRows=[hdBlankRow()];
  /* Pre-set to whatever the list is filtered to: if you are looking at the
     Mumbai calendar, that is the calendar you are adding to. Otherwise the row
     starts entity-wide, which is what most holidays are. */
  if(hdBranchFilter&&hdBranchFilter!==HD_ALL_BRANCHES)hdDraftRows[0].branches=[hdBranchFilter];
  hdDraftEntity=hdCurrentEntityName();
  hdPickOpen='';hdPickState={};
  hdModalOpen=true;renderADTPage();
}
function cancelAddHoliday(){
  hdPickClose();
  hdDraftRows=[];hdDraftEntity='';hdModalOpen=false;renderADTPage();
}
// Read the DOM back into state before any repaint.
function hdSyncRows(){
  hdDraftRows.forEach(function(r,i){
    const n=document.getElementById('hd-row-name-'+i);if(n)r.name=n.value.trim();
    const d=document.getElementById('hd-row-date-'+i);if(d)r.date=d.value;
    const c=document.getElementById('hd-row-rec-'+i);if(c)r.recurring=c.checked;
    r.type=getCustomSelectValue('hd-row-type-'+i)||r.type;
    // branches are written straight onto the row by the picker, so there is
    // nothing to read back for them.
  });
}
function hdRenderRows(){
  const list=document.getElementById('hd-row-list');
  if(!list){renderADTPage();return;}
  list.innerHTML=hdRowsHTML();
  hdPaintSummary();
}
function hdAddRow(){
  hdPickClose();hdSyncRows();
  hdDraftRows.push(hdBlankRow(hdDraftRows[hdDraftRows.length-1]));
  hdRenderRows();
}
function hdRemoveRow(i){
  hdPickClose();hdSyncRows();
  if(hdDraftRows.length<=1)return;   // an empty batch is not a batch
  hdDraftRows.splice(i,1);hdRenderRows();
}
/* apCD's onpick hook is handed the value, not the field, so there is no way to
   know WHICH row moved — and no need to. The whole list is cheap to repaint,
   and repainting it is what lets the weekend note under a row appear the
   moment its date makes it true. Nothing is focused at this point: the click
   that got here was on a calendar cell. */
function hdDatePicked(){hdPickClose();hdSyncRows();hdRenderRows();}
function hdRowsHTML(){
  const iTrash='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
  return hdDraftRows.map(function(r,i){
    const only=hdDraftRows.length===1;
    const day=hdDayName(r.date);
    /* A date already used by an earlier row in this same batch. Flagged here,
       inline and while it is still being typed, rather than only at submit —
       a duplicate you can see is a duplicate you fix. */
    const dupe=r.date&&hdDraftRows.some(function(o,j){return j<i&&o.date===r.date;});
    let note='';
    if(dupe)note='<div class="hd-row-note is-bad">Row '+(i+1)+' repeats a date already used above.</div>';
    else if(hdIsWeekend(r.date))note='<div class="hd-row-note">Falls on a '+day+' — no working day is lost.</div>';
    /* DAY LOST ITS COLUMN, NOT ITS PLACE. It was a whole grid column holding
       one derived word in a disabled-looking box — and the column the row
       actually needed was who the holiday is for. The weekday now sits under
       the date it comes from, which is where it was always true. */
    return '<div class="hd-row-form'+(dupe?' is-bad':'')+'">'
      +'<div class="hd-row-index">'+(i+1)+'</div>'
      +'<div class="hd-cell"><input class="ep-form-input" id="hd-row-name-'+i+'" value="'+attrSafe(r.name)+'" placeholder="e.g. Republic Day" aria-label="Holiday name, row '+(i+1)+'" oninput="hdUpdateSummary()"></div>'
      +'<div class="hd-cell">'+apCD('hd-row-date-'+i,r.date,'Select date','hdDatePicked')
        +'<div class="hd-cell-sub">'+(day||'Weekday appears here')+'</div></div>'
      /* The shared customSelect has no change hook, so the cell listens instead:
         the click bubbles up after selectCustomOption has written the value, and
         the deferred call reads it back so the footer count and the button label
         move on a Type pick the same way they move on a name keystroke. */
      +'<div class="hd-cell" onclick="setTimeout(hdUpdateSummary,0)">'+customSelect('hd-row-type-'+i,r.type,HD_TYPES,'Select Type')+'</div>'
      +'<div class="hd-cell">'+hdBranchPickerHTML('r'+i)+'</div>'
      +'<div class="hd-cell"><label class="hd-check" title="Recurs on the same date every year"><input type="checkbox" id="hd-row-rec-'+i+'"'+(r.recurring?' checked':'')+' onchange="hdUpdateSummary()"><span>Yearly</span></label></div>'
      +'<button class="hd-row-del" onclick="hdRemoveRow('+i+')" title="'
        +(only?'A batch needs at least one holiday':'Remove this holiday')+'"'+(only?' disabled':'')+'>'+iTrash+'</button>'
      +note
      +'</div>';
  }).join('');
}
// A row counts as ready only once it can actually become a holiday.
function hdReadyRows(){return hdDraftRows.filter(function(r){return r.name&&r.date&&r.type;});}
function hdSummaryText(){
  const ready=hdReadyRows();
  if(!ready.length)return 'Give each row a name, a date and a type.';
  const by={};
  ready.forEach(function(r){by[r.type]=(by[r.type]||0)+1;});
  const parts=Object.keys(by).map(function(k){return by[k]+' '+k.replace(/ Holiday$/,'');});
  return ready.length+' holiday'+(ready.length===1?'':'s')+' ready — '+parts.join(', ');
}
function hdSubmitLabel(){
  const n=hdReadyRows().length;
  return n>1?('Add '+n+' Holidays'):'Add Holiday';
}
/* The footer restates the batch as it is typed, so "Add 6 Holidays" is a count
   the user has already watched climb rather than a number to trust on faith. */
function hdPaintSummary(){
  const sum=document.getElementById('hd-summary');if(sum)sum.textContent=hdSummaryText();
  const btn=document.getElementById('hd-submit-btn');if(btn)btn.textContent=hdSubmitLabel();
}
function hdUpdateSummary(){hdSyncRows();hdPaintSummary();}
/* Same popup every other creation form uses — .ct-modal-overlay / .ct-modal,
   Cancel and the primary action on one right-aligned row. Only the width
   differs, because a holiday row is five controls wide and 560px would stack
   them into unreadable columns. */
function buildAddHolidaysModalHTML(){
  if(!hdDraftRows.length)hdDraftRows=[hdBlankRow()];
  const xSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const plusSvg='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const bldSvg='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="7" x2="9.01" y2="7"/><line x1="15" y1="7" x2="15.01" y2="7"/><line x1="9" y1="12" x2="9.01" y2="12"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="9" y1="17" x2="15" y2="17"/></svg>';
  const lockSvg='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Add Holidays</span>'
      +'<button class="ct-modal-close" onclick="cancelAddHoliday()">'+xSvg+'</button></div>'
    +'<p class="ct-modal-sub">One row per holiday — its own name, its own date, and its own branches. A holiday can apply to the whole entity or to any set of its offices.</p>'

    /* Entity is stated, not offered — see startAddHoliday. */
    +'<div class="hd-entity-row">'
      +'<div class="hd-entity-ico">'+bldSvg+'</div>'
      +'<div class="hd-entity-text">'
        +'<div class="hd-entity-label">Entity</div>'
        +'<div class="hd-entity-name">'+(hdDraftEntity||'—')+'</div>'
      +'</div>'
      +'<span class="hd-entity-lock" title="Holidays are added to the entity you are working in — switch entity from the top bar">'+lockSvg+' Current entity</span>'
    +'</div>'

    +'<div class="ep-form-card" style="padding:0;overflow:visible;margin-bottom:18px">'
    +'<div class="hd-rows-head">'
      +'<span class="ep-form-title">Holidays</span>'
      +'<div class="hd-rows-head-right">'
        +'<button class="hd-add-row" onclick="hdAddRow()">'+plusSvg+'Add Holiday</button>'
      +'</div>'
    +'</div>'
    +'<div class="hd-rows-body">'
      +'<div class="hd-row-head" aria-hidden="true">'
        +'<span></span><span>Holiday Name <b class="req">*</b></span><span>Date <b class="req">*</b></span>'
        +'<span>Type <b class="req">*</b></span><span>Applies to</span><span>Repeats</span><span></span>'
      +'</div>'
      +'<div id="hd-row-list">'+hdRowsHTML()+'</div>'
    +'</div>'
    +'</div>'

    +'<div class="ct-modal-foot">'
    +'<div class="hd-summary" id="hd-summary">'+hdSummaryText()+'</div>'
    +'<div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="cancelAddHoliday()">Cancel</button>'
      +'<button class="ep-save-btn" id="hd-submit-btn" onclick="submitAddHolidays()">'+hdSubmitLabel()+'</button>'
    +'</div>'
    +'</div>'
    +'</div></div>';
}
function submitAddHolidays(){
  hdPickClose();hdSyncRows();
  const entity=hdDraftEntity||hdCurrentEntityName();
  if(!entity){showToast('No entity selected','error','Pick an entity from the top bar first.');return;}
  /* Validated per row rather than once at the end, so the message can name
     WHICH holiday is wrong — "Diwali has no date" is actionable, "check your
     rows" is not. */
  const seen={};
  for(let i=0;i<hdDraftRows.length;i++){
    const r=hdDraftRows[i],n=i+1;
    if(!r.name){showToast('Row '+n+' has no Holiday Name','error');return;}
    if(!r.date){showToast('"'+r.name+'" has no date','error','Every holiday needs a date.');return;}
    if(!r.type){showToast('"'+r.name+'" has no type','error','Pick Public, Optional or Company.');return;}
    /* A repeated date is only a problem where the two rows reach the same
       office. Two rows on one date for two different branches is exactly what
       the audience list is for. */
    const rb=r.branches||[];
    const twin=seen[r.date]&&hdAudienceOverlap(rb,seen[r.date].branches);
    if(twin){showToast('Two holidays on '+hdDateLabel(r.date),'error',
      '"'+seen[r.date].name+'" already uses that date for '+hdBranchLabel(rb)+' in this batch.');return;}
    if(!seen[r.date])seen[r.date]={name:r.name,branches:rb};
    /* Same rule against what is already published. A Hyderabad-only holiday
       sharing a date with a Mumbai-only one is a real arrangement, not a
       conflict — two entity-wide ones on a date is. */
    const clash=holidaysData.find(function(h){
      return h.entity===entity&&h.status==='Active'&&h.date===r.date&&hdAudienceOverlap(hdBranches(h),rb);
    });
    if(clash){showToast(hdDateLabel(r.date)+' is already a holiday','error',
      '"'+clash.name+'" ('+hdBranchText(clash)+') is on the '+entity+' calendar for that date.');return;}
  }
  const now=new Date();
  const stamp=now.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
    +' | '+now.toLocaleTimeString('en-US',{hour12:true});
  const added=hdDraftRows.slice();
  added.forEach(function(r){
    holidaysData.push({id:holidayNextId++,name:r.name,date:r.date,type:r.type,
      branches:(r.branches||[]).slice(),entity:entity,
      recurring:!!r.recurring,status:'Active',createdBy:CURRENT_USER,createdAt:stamp,logs:[]});
  });
  hdDraftRows=[];hdModalOpen=false;
  /* Land on what was just added. A batch filed for a year the list is not
     showing would otherwise save into a screen that does not contain it. */
  const y=hdYearOf(added[0].date);
  if(hdYearFilter&&hdYearFilter!==y)hdYearFilter=y;
  // A filter that hides what was just filed is a filter that has to go.
  if(hdBranchFilter&&!added.some(function(r){return hdBranchMatch({branches:r.branches},hdBranchFilter);}))hdBranchFilter='';
  if(hdTypeFilter&&!added.some(function(r){return r.type===hdTypeFilter;}))hdTypeFilter='';
  hdStatusFilter='';
  hdUpcomingOnly=false;
  hdDraftEntity='';hdPickState={};
  /* THIS LIST IS BY DATE, NOT BY WHEN IT WAS FILED. A calendar out of date
     order is not a calendar, so a new holiday cannot simply be put on top the
     way every other listing does it. The page goes to wherever the row landed
     instead, and the row is marked so the eye finds it there. */
  const newIds=holidaysData.slice(-added.length).map(function(h){return h.id;});
  lpLanded('holidays',newIds);
  page='holidays';
  const at=hdRows().findIndex(function(h){return h.id===newIds[0];});
  if(at>-1)lpLandedAt('holidays',at);
  renderADTPage();
  const n=added.length;
  const wide=added.filter(function(r){return !(r.branches&&r.branches.length);}).length;
  showToast(n+' holiday'+(n===1?'':'s')+' added','success',
    n===1?('"'+added[0].name+'" is on the '+entity+' calendar for '+hdDateLabel(added[0].date)
           +' — '+hdBranchLabel(added[0].branches)+'.')
         :('Published to the '+entity+' calendar'
           +(wide===n?' for every branch.':wide?', '+(n-wide)+' of them branch-specific.':' for selected branches.')));
}

/* CREATION IS A POPUP, like every other create form in the app — Payheads,
   Holidays, Compliance, Rates & Rules and Contract Templates all file their
   record from a .ct-modal without leaving the listing behind them. This was
   the last one that navigated away to a page of its own, which meant the list
   you were adding to vanished the moment you started adding to it, and Cancel
   was a navigation rather than a dismissal.

   NOTHING ABOUT THE FORM ITSELF CHANGED. The same three sections, the same
   field ids and the same submit read it, so the employee picker and its live
   repaint (renderApEmpLists) work exactly as they did — only the shell around
   them is different. */
function startAddLeavePolicy(){
  selectedEmps=new Set();apFilterType='';apFilterValue='';
  lpAddModalOpen=true;renderADTPage();
}
function buildAddLeavePolicyModalHTML(){
  const leaveTypes=['Casual Leave','Sick Leave','Earned Leave','Maternity Leave','Paternity Leave','Compensatory Leave'];
  const xSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Add Leave Policy</span>'
      +'<button class="ct-modal-close" onclick="cancelAddPolicy()">'+xSvg+'</button></div>'
    +'<p class="ct-modal-sub">Set the entitlement and its rules, then choose who it applies to.</p>'
    +'<div class="ep-form-card" style="padding:0;overflow:visible;margin-bottom:18px">'
    +'<div class="policy-form-section">'
    +'<div class="policy-section-title">Basic Information</div>'
    +'<div class="policy-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Leave Type Name <span class="req">*</span></label>'
    +apCS('ap-type',leaveTypes,'','Select leave type')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Status <span class="req">*</span></label>'
    +apCS('ap-status',['Active','Inactive'],'Active','Select Status')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Yearly Count <span class="req">*</span></label>'
    +'<input class="ep-form-input" id="ap-yearly" type="number" placeholder="e.g. 12" min="0"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Monthly Limit <span style="color:var(--gray);font-weight:400;font-size:11px">(optional)</span></label>'
    +'<input class="ep-form-input" id="ap-monthly" type="number" placeholder="e.g. 2" min="0"></div>'
    +'</div></div>'
    +'<div class="policy-form-section">'
    +'<div class="policy-section-title">Rules &amp; Accruals</div>'
    +'<div class="policy-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Carry Forward Allowed <span class="req">*</span></label>'
    +apCS('ap-carry',['Yes','No'],'No','Select')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Carry Forward Limit <span style="color:var(--gray);font-weight:400;font-size:11px">(optional)</span></label>'
    +'<input class="ep-form-input" id="ap-cflimit" type="number" placeholder="e.g. 10" min="0"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Applicable During Probation <span class="req">*</span></label>'
    +apCS('ap-probation',['Yes','No'],'No','Select')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Prorate Allocation</label>'
    +apCS('ap-prorate',['Yes','No'],'No','Select')+'</div>'
    +'</div></div>'
    +buildApplicableEmpSection()
    +'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="cancelAddPolicy()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="submitAddLeavePolicy()">Create Policy</button>'
    +'</div></div>'
    +'</div></div>';
}
function submitAddLeavePolicy(){
  const typeWrap=document.getElementById('csw-ap-type');
  const typeVal=typeWrap?typeWrap.querySelector('.cs-value').textContent.trim():'';
  const statusWrap=document.getElementById('csw-ap-status');
  const statusVal=statusWrap?statusWrap.querySelector('.cs-value').textContent.trim():'';
  const yearly=document.getElementById('ap-yearly');
  if(!typeVal||typeVal==='Select leave type'){showToast('Please select a Leave Type Name','error');return;}
  if(!yearly||!yearly.value){showToast('Please enter a Yearly Count','error');yearly&&yearly.focus();return;}
  if(!statusVal||statusVal==='Select Status'){showToast('Please select a Status','error');return;}
  const newId=leavePoliciesData.length?Math.max(...leavePoliciesData.map(p=>p.id))+1:1;
  const monthly=document.getElementById('ap-monthly');
  const cflimit=document.getElementById('ap-cflimit');
  const carryWrap=document.getElementById('csw-ap-carry');
  const carryVal=carryWrap?carryWrap.querySelector('.cs-value').textContent.trim():'No';
  const probWrap=document.getElementById('csw-ap-probation');
  const probVal=probWrap?probWrap.querySelector('.cs-value').textContent.trim():'No';
  const proWrap=document.getElementById('csw-ap-prorate');
  const proVal=proWrap?proWrap.querySelector('.cs-value').textContent.trim():'No';
  const filterTypeWrap=document.getElementById('csw-ap-filter-type');
  const filterTypeVal=filterTypeWrap?filterTypeWrap.querySelector('.cs-value').textContent.trim():'';
  const filterValWrap=document.getElementById('csw-ap-filter-value');
  const filterValStr=filterValWrap?filterValWrap.querySelector('.cs-value').textContent.trim():'';
  const employees=[...selectedEmps].map(id=>{const e=empPool.find(x=>x.id===id);return e?e.name:'';}).filter(Boolean);
  lpLanded('leave-policies',newId);
  leavePoliciesData.unshift({
    id:newId,type:typeVal,yearly:parseInt(yearly.value)||0,
    monthly:monthly&&monthly.value?parseInt(monthly.value):null,
    carryForward:cflimit&&cflimit.value?parseInt(cflimit.value):null,
    probation:probVal==='Yes',prorate:proVal==='Yes',status:statusVal,
    assignBy:filterTypeVal,assignValue:filterValStr,employees:employees
  });
  selectedEmps=new Set();apFilterType='';apFilterValue='';lpAddModalOpen=false;
  renderADTPage();
  showToast('Leave policy created','success','"'+typeVal+'" is now '+statusVal.toLowerCase()+'.');
}
function submitEditLeavePolicy(){
  page='leave-policies';renderADTPage();
  showToast('Leave policy updated','success','Your changes have been saved.');
}
/* The tiles are a second way into the Status filter, not a filter of their own -
   clicking one sets what the dropdown would have set, and clicking it again
   clears it. Same shape as the Payheads and Holidays tiles. */
function lpToggleStatFilter(v){
  lpFilterStatus=lpFilterStatus===v?'':v;
  lpSidebarPolicyId=null;renderADTPage();
}
function applyLpFilters(){lpFilterQuery=lpSearchValue('lp-f-q');lpSidebarPolicyId=null;renderADTPage();}
function buildLeavePoliciesHTML(){
  const numVal=(v)=>v!==null&&v!==undefined?'<span style="color:var(--black);font-weight:600">'+v+'</span>':'<span style="color:#9ca3af">-</span>';
  const ynCell=(v)=>'<span style="color:'+(v?'#16a34a':'#374151')+';font-weight:500">'+(v?'Yes':'No')+'</span>';
  /* The Status filter was stored and never used: csSelect() wrote lpFilterStatus,
     the value rode along in the cache key, and the table still listed every
     policy. The rows are filtered here now, which is also what gives the tiles
     below something to do. lpFilterField is left alone - it names which column a
     search would look in, and there is no search box to give it a term. */
  const lpCount=function(st){
    return leavePoliciesData.filter(function(x){return x.status===st;}).length;
  };
  let lpRows=leavePoliciesData;
  if(lpFilterStatus)lpRows=lpRows.filter(function(x){return x.status===lpFilterStatus;});
  // A panel must always belong to a row you can see.
  if(lpSidebarPolicyId&&!lpRows.some(function(x){return x.id===lpSidebarPolicyId;}))lpSidebarPolicyId=null;
  const pgn=listPage('leave-policies',[lpFilterField,lpFilterStatus,lpFilterQuery].join('|'),lpSearchRows(lpRows,lpFilterQuery).map((p,i)=>'<tr class="lp-row'+(lpSidebarPolicyId===p.id?' lp-row-selected':'')+'" id="lp-row-'+p.id+'" onclick="openLPSidebar('+p.id+')">'
    +'<td style="color:var(--gray);font-size:13px">'+(i+1)+'</td>'
    +'<td style="font-weight:600;color:var(--navy)">'+p.type+'</td>'
    +'<td>'+numVal(p.yearly)+'</td>'
    +'<td>'+numVal(p.monthly)+'</td>'
    +'<td>'+numVal(p.carryForward)+'</td>'
    /* During Probation and Prorate are on the panel's Basic Details. */
    +'<td><span class="lp-status-badge '+p.status.toLowerCase()+'">'+p.status+'</span></td>'
    +'<td onclick="event.stopPropagation()">'+rowLogCell('leave-policies',p.id)+'</td>'
    +'</tr>'),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No leave policies match this filter.</td></tr>');
  const sbInner=lpSidebarPolicyId?sbRender(renderLPSidebar,'leave-policy'):'';
  return '<div class="lp-page">'
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('lp-f-q',lpFilterQuery,'Search policy','applyLpFilters()')
    +apCS('lp-filter-field',['Type Name','Yearly Count','Monthly Limit'],lpFilterField,'Select')
    +apCS('lp-filter-status',['Active','Inactive'],lpFilterStatus,'Status')
    +clearFiltersBtn([lpFilterField,lpFilterStatus,lpFilterQuery],'resetLpFilters()')
    // csSelect() has already stored the pick; Search only has to repaint.
    +'<button class="lp-pill-search" onclick="applyLpFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'
    +'<div class="listing-stat'+(lpFilterStatus==='Active'?' stat-selected':'')+'" onclick="lpToggleStatFilter(\'Active\')"><div class="listing-stat-count" style="color:var(--st-ok-fg)">'+lpCount('Active')+'</div><div class="listing-stat-label">Active</div></div>'
    +'<div class="listing-stat'+(lpFilterStatus==='Inactive'?' stat-selected':'')+'" onclick="lpToggleStatFilter(\'Inactive\')"><div class="listing-stat-count" style="color:var(--st-idle-fg)">'+lpCount('Inactive')+'</div><div class="listing-stat-label">Inactive</div></div>'
    +'</div></div>'
    +'<div class="lp-split-wrap" style="margin-top:14px">'
    +'<div class="lp-split-main">'
    +'<div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr>'
    +'<th>SR. NO</th><th>TYPE NAME</th><th>YEARLY COUNT</th><th>MONTHLY LIMIT</th>'
    +'<th>CARRY FORWARD LIMIT</th><th>STATUS</th><th>ACTION</th>'
    +'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(lpSidebarPolicyId?' open':'')+'" id="lp-isb">'
    +'<div class="lp-isb" id="lp-isb-inner">'+sbInner+'</div>'
    +'</div>'
    +'</div>'
  +'</div>'
  +(lpAddModalOpen?buildAddLeavePolicyModalHTML():'');
}
function buildEditLeavePolicyHTML(){
  const p=leavePoliciesData.find(function(x){return x.id===leaveEditId;})||leavePoliciesData[0];
  /* These were native <select>s, so their lists were drawn by the operating
     system - the one screen in the product still doing that. customSelect is
     what the eight modals and the rest of the page forms already use. */
  const ynDd=(id,v)=>customSelect(id,v?'Yes':'No',['Yes','No']);
  return '<div class="ep-page">'
    +'<div>'
      +'<button class="ep-back" onclick="navigatePage(\'leave-policies\')">'
        +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>'
        +' Back to Leave Policies'
      +'</button>'
    +'</div>'
    +'<div class="ep-header">'
      +'<div class="ep-title-wrap"><span class="ep-title">Edit Leave Policy</span></div>'
      +'<div class="ep-actions">'
        +'<button class="ep-cancel-btn" onclick="navigatePage(\'leave-policies\')">Cancel</button>'
        +'<button class="ep-save-btn" onclick="submitEditLeavePolicy()">Save Changes</button>'
      +'</div>'
    +'</div>'
    +'<div class="ep-summary-card">'
      +'<div class="ep-summary-left">'
        +'<div class="ep-summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.8" width="22" height="22"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/></svg></div>'
        +'<div>'
          +'<div class="ep-summary-name">Editing Policy: '+p.type+'</div>'
          +'<div class="ep-summary-meta">'
            +'<span>Opened from policy list</span><span class="ep-summary-sep">&#8226;</span>'
            +'<span>Type: '+p.type+'</span><span class="ep-summary-sep">&#8226;</span>'
            +'<span>Status:</span>'
            +'<span class="ep-status-pill"><span class="ep-status-dot"></span>'+p.status+'</span>'
          +'</div>'
        +'</div>'
      +'</div>'
      +'<div class="ep-stats">'
        +'<div class="ep-stat"><div class="ep-stat-label">Yearly Count</div><div class="ep-stat-val">'+p.yearly+'</div></div>'
        +'<div class="ep-stat"><div class="ep-stat-label">During Probation</div><div class="ep-stat-val green">'+(p.probation?'Yes':'No')+'</div></div>'
        +'<div class="ep-stat"><div class="ep-stat-label">Carry Forward Limit</div><div class="ep-stat-val">'+(p.carryForward||'-')+'</div></div>'
        +'<div class="ep-stat"><div class="ep-stat-label">Status</div><div class="ep-stat-val green">'+p.status+'</div></div>'
      +'</div>'
    +'</div>'
    +'<div class="ep-form-card">'
      +'<div class="ep-form-title">Leave Policy Details</div>'
      +'<div class="ep-form-grid">'
        +'<div class="ep-form-group"><label class="ep-form-label">Leave Type Name <span class="req">*</span></label><input class="ep-form-input" type="text" value="'+p.type+'"></div>'
        +'<div class="ep-form-group"><label class="ep-form-label">Carry Forward Allowed <span class="req">*</span></label>'+ynDd('lpe-carryforward',!!p.carryForward)+'</div>'
        +'<div class="ep-form-group"><label class="ep-form-label">Yearly Count <span class="req">*</span></label><input class="ep-form-input" type="number" value="'+p.yearly+'"></div>'
        +'<div class="ep-form-group"><label class="ep-form-label">Applicable During Probation <span class="req">*</span></label>'+ynDd('lpe-probation',!!p.probation)+'</div>'
        +'<div class="ep-form-group"><label class="ep-form-label">Monthly Limit</label><input class="ep-form-input" type="number" value="'+(p.monthly||'')+'"></div>'
        +'<div class="ep-form-group"><label class="ep-form-label">Carry Forward Limit</label><input class="ep-form-input" type="number" value="'+(p.carryForward||'')+'"></div>'
        +'<div class="ep-form-group"><label class="ep-form-label">Prorate Allocation</label>'+ynDd('lpe-prorate',!!p.prorate)+'</div>'
        +'<div class="ep-form-group"><label class="ep-form-label">Status <span class="req">*</span></label>'+customSelect('lpe-status',p.status==='Inactive'?'Inactive':'Active',['Active','Inactive'])+'</div>'
        +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Applicable Employees</label>'
          +'<div class="ep-emp-search"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search employees..."></div>'
          +'<div class="ep-emp-tags">'
            +(p.employees&&p.employees.length?p.employees.map(name=>{const emp=empPool.find(e=>e.name===name);return '<span class="ep-emp-tag">'+name+(emp?' &mdash; '+emp.key:'')+'<button title="Remove">&times;</button></span>';}).join(''):'<span style="font-size:12px;color:var(--gray);padding:4px">No employees assigned</span>')
          +'</div>'
        +'</div>'
      +'</div>'
    +'</div>'
  +'</div>';
}
// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ LP INLINE SPLIT SIDEBAR ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
// Open/close in place — same as every other listing — so the panel keeps its
// width transition and the row highlight is applied without a full re-render.
function markLPSelectedRow(id){
  document.querySelectorAll('#adt-content tr.lp-row').forEach(function(r){
    r.classList.toggle('lp-row-selected',id!=null&&r.id==='lp-row-'+id);
  });
}
function openLPSidebar(id){
  if(lpSidebarPolicyId!=null&&String(lpSidebarPolicyId)!==String(id)&&sbLeaveGuard('lp',function(){openLPSidebar(id);}))return;
  lpSidebarTab=sbKeepTab(lpSidebarPolicyId,lpSidebarTab);lpSidebarPolicyId=id;lpSidebarEditMode=false;lpEmpEditMode=false;
  const sb=document.getElementById('lp-isb');
  if(!sb){page='leave-policies';renderADTPage();return;}
  sb.classList.add('open');
  isbTab('lp',renderLPSidebar);   // body-only swap when the panel is already open
  markLPSelectedRow(id);
}
function closeLPSidebar(){if(sbLeaveGuard('lp',closeLPSidebar))return;
  lpSidebarPolicyId=null;lpSidebarEditMode=false;lpEmpEditMode=false;
  const sb=document.getElementById('lp-isb');
  if(!sb){renderADTPage();return;}
  sb.classList.remove('open');
  markLPSelectedRow(null);
}
function renderLPSidebar(){
  const p=leavePoliciesData.find(x=>x.id===lpSidebarPolicyId);
  if(!p)return '<div class="lp-tab-placeholder">Policy not found.</div>';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'employees',label:'Employees'},{id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'lp-isb-tabs\')" title="Scroll left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>'
    +'<div class="lp-isb-tabs" id="lp-isb-tabs">'+tabs.map(t=>'<button class="lp-isb-tab'+(lpSidebarTab===t.id?' active':'')+'" onclick="navLPSidebar(\''+t.id+'\')">'+t.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'lp-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeLPSidebar()" title="Close"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  let body='';
  if(lpSidebarTab==='basic-details'){
    if(lpSidebarEditMode){
      body=sbHero({icon:sbIco.calendar,name:p.type,meta:[p.yearly+' days a year',p.assignBy+': '+p.assignValue],status:sbHeroBadge(p.status),editing:true})
        +'<div class="lp-sb-edit-form"><div class="lp-sb-edit-section"><div class="lp-sb-form-grid">'
        +'<div class="lp-sb-field"><label>Leave Type</label><input class="ep-form-input" id="lpsb-type" value="'+p.type+'"></div>'
        +'<div class="lp-sb-field"><label>Status</label>'+sbSelect('lpsb-status',['Active','Inactive'],p.status)+'</div>'
        +'<div class="lp-sb-field"><label>Yearly Count</label><input class="ep-form-input" id="lpsb-yearly" type="number" value="'+p.yearly+'"></div>'
        +'<div class="lp-sb-field"><label>Monthly Limit</label><input class="ep-form-input" id="lpsb-monthly" type="number" value="'+(p.monthly||'')+'"></div>'
        +'<div class="lp-sb-field"><label>Carry Forward Limit</label><input class="ep-form-input" id="lpsb-cf" type="number" value="'+(p.carryForward||'')+'"></div>'
        +'<div class="lp-sb-field"><label>During Probation</label>'+sbSelect('lpsb-prob',['Yes','No'],p.probation?'Yes':'No')+'</div>'
        +'<div class="lp-sb-field"><label>Prorate</label>'+sbSelect('lpsb-prorate',['Yes','No'],p.prorate?'Yes':'No')+'</div>'
        +'</div><div class="lp-sb-form-actions">'
        +'<button class="ep-cancel-btn" onclick="lpSidebarEditMode=false;refreshLPSidebar()">Cancel</button>'
        +'<button class="ep-save-btn" onclick="saveLPSidebarEdit()">Save changes</button>'
        +'</div></div></div>';
    }else{
      /* The em-dash here was mojibake - the file had it multiply-encoded, so an
         empty field rendered a run of Ã-junk under <meta charset="UTF-8">
         rather than a dash. An entity cannot be re-encoded by accident. */
      const dash='<span class="sb-dash">&mdash;</span>';
      const ynVal=lpFlagValue;                    /* plain text - see lpFlagValue */
      const nullOrDash=(v)=>(v!==null&&v!==undefined&&v!=='')?v:dash;
      const statusVal=sbStatus(p.status);
      // icons
      const iTag='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
      const iStatus='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
      const iCal='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
      const iArrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>';
      const iCircleNo='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
      const iUser='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
      const iPct='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>';
      const iFilter='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>';
      const iLayout='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
      const fc=(ico,label,val)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
      body=sbHero({icon:sbIco.calendar,name:p.type,meta:[p.yearly+' days a year',p.assignBy+': '+p.assignValue],status:sbHeroBadge(p.status),edit:'<button class="lp-sb-view-edit-btn" onclick="lpSidebarEditMode=true;refreshLPSidebar()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>'})
        +'<div class="lp-sb-detail-grid">'
        +fc(iTag,'Leave Type Name',p.type)
        +fc(iStatus,'Status',statusVal)
        +fc(iCal,'Yearly Count',p.yearly)
        +fc(iCal,'Monthly Limit',nullOrDash(p.monthly))
        +fc(iArrow,'Carry Forward Limit',nullOrDash(p.carryForward))
        +fc(iCircleNo,'Carry Forward Allowed',ynVal(p.carryForward!==null&&p.carryForward!==undefined&&p.carryForward!==0))
        +fc(iUser,'Probation Allowed',ynVal(p.probation))
        +fc(iPct,'Prorate Allocation',ynVal(p.prorate))
        +(p.assignBy?fc(iFilter,'Assign By',p.assignBy):'')
        +(p.assignValue?fc(iLayout,p.assignBy||'Assigned Value',p.assignValue):'')
        +'</div>';
    }
  }else if(lpSidebarTab==='employees'){
    const emps=p.employees||[];
    if(lpEmpEditMode){
      body=lpSidebarEmpSelectorHTML(emps);
    }else{
      body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Employees</span>'
        +'<div style="display:flex;gap:8px;align-items:center"><span class="lp-sb-emp-count">'+emps.length+' assigned</span>'
        +'<button class="ep-save-btn" style="padding:6px 14px;font-size:12px" onclick="lpEmpEditMode=true;refreshLPSidebar()">Manage</button></div></div>'
        +(emps.length?'<div class="lp-sb-emp-list">'+emps.map(function(name){
          var initials=name.split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
          return '<div class="lp-sb-emp-item"><div class="lp-sb-emp-avatar">'+initials+'</div><span class="lp-sb-emp-name">'+name+'</span><button class="lp-sb-emp-remove" onclick="removeLPEmployee(\''+name.replace(/'/g,"\\'")+'\')">&times;</button></div>';
        }).join('')+'</div>':'<div class="lp-sb-empty">No employees assigned yet.</div>');
    }
  }else if(lpSidebarTab==='history'){
    body=sbHistoryHTML(p);
  }else if(lpSidebarTab==='logs'){
    const logs=lpLogsData[p.id]||[];
    const logStatusKey=(s)=>({Active:'active',Inactive:'inactive'}[s]||'default');
    const csk=logStatusKey(p.status||'Active');
    const formHTML='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+csk+'"></span>'+(p.status||'Active')+'</div>'
      +'<p class="lp-logs-form-sub">Update policy status and add a comment</p>'
      +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
      +apCS('lp-log-status-sel',['Active','Inactive'],p.status||'','Select Status')
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="lp-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<button class="lp-logs-save-btn" onclick="lpSaveLog('+p.id+')">Save</button>'
      +'</div>';
    body=lpLogsView(logs,formHTML);
  }else if(lpSidebarTab==='workflow'){
    const lpDone=wfDoneFromLogs(lpLogsData[p.id]);
    body=wfTimelineHTML(wfApproval(p,lpDone.length?lpDone:(lpWorkflowData[p.id]||[]),'HR'));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function refreshLPSidebar(){
  const inner=document.getElementById('lp-isb-inner');
  if(inner)inner.innerHTML=sbRender(renderLPSidebar,'leave-policy');
}
function navLPSidebar(tabId){
  lpSidebarTab=tabId;if(!sbHasDraft('lp'))lpSidebarEditMode=false;lpEmpEditMode=false;
  isbTab('lp',renderLPSidebar);
}
function saveLPSidebarEdit(){
  const p=leavePoliciesData.find(x=>x.id===lpSidebarPolicyId);if(!p)return;
  const typeEl=document.getElementById('lpsb-type');if(typeEl)p.type=typeEl.value;
  const statusEl=document.getElementById('lpsb-status');if(statusEl)p.status=statusEl.value;
  const yearlyEl=document.getElementById('lpsb-yearly');if(yearlyEl)p.yearly=parseInt(yearlyEl.value)||p.yearly;
  const monthlyEl=document.getElementById('lpsb-monthly');if(monthlyEl)p.monthly=monthlyEl.value?parseInt(monthlyEl.value):null;
  const cfEl=document.getElementById('lpsb-cf');if(cfEl)p.carryForward=cfEl.value?parseInt(cfEl.value):null;
  const probEl=document.getElementById('lpsb-prob');if(probEl)p.probation=probEl.value==='Yes';
  const proEl=document.getElementById('lpsb-prorate');if(proEl)p.prorate=proEl.value==='Yes';
  lpSidebarEditMode=false;refreshLPSidebar();
}
function removeLPEmployee(empName){
  const p=leavePoliciesData.find(x=>x.id===lpSidebarPolicyId);if(!p)return;
  p.employees=(p.employees||[]).filter(n=>n!==empName);refreshLPSidebar();
}
function lpAddEmpToPolicy(empId){
  const p=leavePoliciesData.find(x=>x.id===lpSidebarPolicyId);if(!p)return;
  const emp=empPool.find(e=>e.id===empId);if(!emp)return;
  if(!p.employees)p.employees=[];
  if(!p.employees.includes(emp.name))p.employees.push(emp.name);
  refreshLPSidebar();
}
function lpSaveLog(policyId){
  const sel=csTrigger('lp-log-status-sel');
  const inp=document.getElementById('lp-log-comment-inp');
  if(!sel||!inp)return;
  const status=getCSValue('lp-log-status-sel');
  const comment=inp.value.trim();
  if(!status){sel.style.borderColor='#b83a3a';setTimeout(()=>{sel.style.borderColor='';},1500);return;}
  if(!comment){inp.style.borderColor='#b83a3a';setTimeout(()=>{inp.style.borderColor='';},1500);return;}
  const now=new Date();
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr=now.getDate()+' '+months[now.getMonth()]+' '+now.getFullYear();
  let h=now.getHours(),m=now.getMinutes(),s=now.getSeconds();
  const ampm=h>=12?'PM':'AM';h=h%12||12;
  const timeStr=(h<10?'0'+h:h)+':'+(m<10?'0'+m:m)+':'+(s<10?'0'+s:s)+' '+ampm;
  if(!lpLogsData[policyId])lpLogsData[policyId]=[];
  lpLogsData[policyId].unshift({date:dateStr,time:timeStr,user:'Shaun Mathew',status,action:comment});
  const p=leavePoliciesData.find(x=>x.id===policyId);
  if(p&&(status==='Active'||status==='Inactive'))p.status=status;
  refreshLPSidebar();
  showToast('Log added','success',p?'"'+p.type+'" status set to '+status+'.':'');
}
function lpSidebarEmpSelectorHTML(policyEmps){
  const available=empPool.filter(e=>!(policyEmps||[]).includes(e.name));
  const availHTML=available.length?available.map(e=>'<button type="button" class="lp-avail-emp-btn" onclick="lpAddEmpToPolicy(\''+e.id+'\')">'
    +'<div class="lp-ae-info"><div class="lp-ae-name">'+e.name+'</div><div class="lp-ae-key">'+e.key+'</div></div>'
    +'<span class="lp-ae-add">+</span></button>').join(''):'<div class="lp-sb-empty">All employees already added.</div>';
  const selHTML=(policyEmps||[]).length?(policyEmps||[]).map(function(name){
    var initials=name.split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
    return '<div class="lp-sb-emp-item"><div class="lp-sb-emp-avatar">'+initials+'</div><span class="lp-sb-emp-name">'+name+'</span><button class="lp-sb-emp-remove" onclick="removeLPEmployee(\''+name.replace(/'/g,"\\'")+'\')">&times;</button></div>';
  }).join(''):'<div class="lp-sb-empty">No employees added.</div>';
  // Done takes the exact slot Manage occupied in view mode: same place,
  // same weight, only the label flips. It used to float alone above the
  // panes as a secondary button, reading like a heading rather than an action.
  return '<div class="lp-sb-emp-edit">'
    +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Employees</span>'
    +'<div style="display:flex;gap:8px;align-items:center"><span class="lp-sb-emp-count">'+((policyEmps||[]).length)+' assigned</span>'
    +'<button class="ep-save-btn" style="padding:6px 14px;font-size:12px" onclick="lpEmpEditMode=false;refreshLPSidebar()">Done</button></div></div>'
    +'<div class="lp-sb-sel-pane"><div class="lp-sb-sel-pane-title">Available Employees</div><div class="lp-avail-emp-list">'+availHTML+'</div></div>'
    +'<div class="lp-sb-sel-pane"><div class="lp-sb-sel-pane-title">Assigned ('+((policyEmps||[]).length)+')</div><div class="lp-sb-sel-emp-list">'+selHTML+'</div></div>'
    +'</div>';
}

// ── MY TIMESHEET PAGE ──
/* ── The punch map ─────────────────────────────────────────────────────────
   DRAWN, NOT FETCHED. The app loads no third-party scripts and is opened
   straight off the filesystem, so a real tile layer (Leaflet, Google, Mapbox)
   would mean a CDN, an API key and a network the rest of this app does not
   need. What a reviewer actually wants from this panel is "was the punch where
   it should have been" — a schematic of the streets around the point, with the
   pin on it and the real coordinates written underneath, answers that without
   putting the whole app behind a network call. Swapping in real tiles later is
   a change to this one function.

   THE MAP IS ALWAYS CENTRED ON THE PIN, which is why the street grid is fixed
   rather than generated per location — a real map centres on what you asked
   for too, and a randomly drawn one would imply geography it does not have. */
function tsMapSVG(fix,tone){
  const ink=tone==='out'?'#b83a3a':'#16a34a';
  const streets=(fix&&fix.place&&fix.place.streets)||['',''];
  return '<svg class="ts-map-svg" viewBox="0 0 320 190" role="img" aria-label="Approximate location of the punch">'
    // land, water, park
    +'<rect width="320" height="190" fill="#eaeff3"/>'
    +'<path d="M0 150 C60 138 96 162 150 152 C210 141 250 166 320 156 L320 190 L0 190Z" fill="#d5e6f4"/>'
    +'<rect x="196" y="26" width="86" height="52" rx="10" fill="#dcecdd"/>'
    +'<rect x="18" y="104" width="58" height="34" rx="8" fill="#dcecdd"/>'
    // blocks
    +['26,26,58,40','98,20,66,46','26,76,50,20','98,78,62,34','196,92,60,36','262,92,44,36','176,20,10,58']
      .map(function(b){var v=b.split(',');
        return '<rect x="'+v[0]+'" y="'+v[1]+'" width="'+v[2]+'" height="'+v[3]+'" rx="3" fill="#e0e6ec"/>';}).join('')
    // roads: the wide pale ones read as roads without needing labels
    +'<g stroke="#fff" fill="none" stroke-linecap="round">'
      +'<path d="M0 68 H320" stroke-width="11"/>'
      +'<path d="M0 88 H320" stroke-width="7"/>'
      +'<path d="M88 0 V190" stroke-width="9"/>'
      +'<path d="M186 0 V150" stroke-width="7"/>'
      +'<path d="M0 20 H320" stroke-width="5"/>'
      +'<path d="M254 0 V92" stroke-width="5"/>'
    +'</g>'
    +'<g fill="#9aa8b6" font-size="7" font-family="inherit" letter-spacing=".3">'
      +'<text x="8" y="65">'+attrSafe(streets[0])+'</text>'
      +'<text x="93" y="118" transform="rotate(-90 93 118)">'+attrSafe(streets[1])+'</text>'
    +'</g>'
    // accuracy halo, then the pin, centred
    +'<circle cx="160" cy="86" r="34" fill="'+ink+'" fill-opacity=".10"/>'
    +'<circle cx="160" cy="86" r="34" fill="none" stroke="'+ink+'" stroke-opacity=".35" stroke-width="1"/>'
    +'<ellipse cx="160" cy="103" rx="7" ry="2.6" fill="rgba(15,23,42,.28)"/>'
    +'<path d="M160 66a9 9 0 0 0-9 9c0 6.6 9 16 9 16s9-9.4 9-16a9 9 0 0 0-9-9z" fill="'+ink+'"/>'
    +'<circle cx="160" cy="75" r="3.4" fill="#fff"/>'
    // scale bar, so the halo has a size the eye can read
    +'<g transform="translate(232,168)">'
      +'<rect x="0" y="-4" width="52" height="2" fill="#64748b"/>'
      +'<rect x="0" y="-7" width="2" height="8" fill="#64748b"/>'
      +'<rect x="50" y="-7" width="2" height="8" fill="#64748b"/>'
      +'<text x="26" y="10" fill="#64748b" font-size="7.5" font-family="inherit" text-anchor="middle">50 m</text>'
    +'</g>'
  +'</svg>';
}
/* The map plus what it cannot draw: the address in words, the coordinates a
   dispute would actually be settled on, and how precise the fix was. */
function tsGoogleMapsURL(fix){
  return 'https://www.google.com/maps/search/?api=1&query='
    +encodeURIComponent(fix.lat.toFixed(6)+','+fix.lng.toFixed(6));
}
function tsMapPanelHTML(placeKey,dateStr,which,timeStr){
  const fix=tsPunchFix(placeKey,dateStr,which);
  if(!fix)return '<div class="ts-map-wrap"><div class="ts-map-none">No location was recorded for this punch.</div></div>';
  const coord=fix.lat.toFixed(5)+'°N, '+fix.lng.toFixed(5)+'°E';
  const homeSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
  const officeSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="7" x2="9.01" y2="7"/><line x1="15" y1="7" x2="15.01" y2="7"/><line x1="9" y1="12" x2="9.01" y2="12"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="9" y1="17" x2="15" y2="17"/></svg>';
  const copySvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const extSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="11" height="11"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  return '<div class="ts-map-wrap">'
    +'<a class="ts-map-frame ts-map-'+which+'" href="'+attrSafe(tsGoogleMapsURL(fix))+'"'
      +' target="_blank" rel="noopener noreferrer" title="Open this location in Google Maps">'
      +tsMapSVG(fix,which)
      +'<span class="ts-map-badge">'+(which==='out'?'Checked out':'Checked in')+(timeStr&&timeStr!=='--'?' · '+timeStr:'')+'</span>'
      +'<span class="ts-map-open">'+extSvg+'Google Maps</span>'
    +'</a>'
    +'<div class="ts-map-meta">'
      +'<div class="ts-map-place">'+(fix.place.kind==='home'?homeSvg:officeSvg)+'<span>'+fix.place.label+'</span></div>'
      +'<div class="ts-map-addr">'+fix.place.address+'</div>'
      +'<div class="ts-map-row">'
        +'<button class="ts-map-coord" onclick="tsCopyCoord(\''+coord+'\')" title="Copy coordinates">'+copySvg+coord+'</button>'
        +'<span class="ts-map-acc" title="How precise the GPS fix was">±'+fix.accuracy+' m</span>'
      +'</div>'
    +'</div>'
  +'</div>';
}
function tsCopyCoord(coord){
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(coord);
  showToast('Coordinates copied','success',coord);
}
/* The two lock icons and the small form the panel grows when a day is being
   entered by hand. Kept next to the panel that uses them rather than in the
   shared icon set: nothing else in the app locks a week. */
const TS_ICO={
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  unlock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
,
  note:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
};
/* ── Time field ──
   The standard dropdown (.cs-wrap / .cs-trigger / .cs-dropdown) holding an
   hour column and a minute column, in place of the browser's own time popup,
   which looked like nothing else in the app. The value lives in a hidden input
   carrying the id, so tsEditPreview / tsSaveEntry still read it by
   getElementById(id).value, as HH:MM in 24-hour time. Minutes step by 5; a
   saved value off that step keeps its own minute in the list. */
const TS_TP_CLOCK='<svg class="cs-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>';
function tsTimeField(id,val){
  const p=(val||'').split(':'),h=p[0]||'',m=p[1]||'';
  const pad=function(n){return String(n).padStart(2,'0');};
  const hrs=[],mins=[];
  for(let i=0;i<24;i++)hrs.push(pad(i));
  for(let i=0;i<60;i+=5)mins.push(pad(i));
  if(m&&mins.indexOf(m)<0){mins.push(m);mins.sort();}
  const col=function(part,list,cur,head){
    return '<div class="ts-tp-col"><div class="ts-tp-head">'+head+'</div>'
      +list.map(function(v){
        return '<div class="cs-option'+(v===cur?' cs-selected':'')+'" data-v="'+v+'" onclick="tsTpPick(this,\''+id+'\',\''+part+'\')">'+v+'</div>';
      }).join('')+'</div>';
  };
  return '<div class="cs-wrap ts-tp" id="csw-'+id+'">'
    +'<button type="button" class="cs-trigger'+(val?'':' cs-placeholder')+'" data-csid="'+id+'" onclick="tsTpToggle(this)">'
      +'<span class="cs-value">'+(val||'--:--')+'</span>'+TS_TP_CLOCK+'</button>'
    +'<div class="cs-dropdown ts-tp-drop" id="csd-'+id+'">'
      +col('h',hrs,h,'Hr')+col('m',mins,m,'Min')
    +'</div></div>'
    +'<input type="hidden" id="'+id+'" value="'+(val||'')+'">';
}
function tsTpToggle(btn){
  csToggle(btn);
  // Open on the chosen time, not on midnight.
  const drop=document.getElementById('csd-'+btn.dataset.csid);
  if(drop&&drop.classList.contains('cs-open'))drop.querySelectorAll('.ts-tp-col').forEach(function(c){
    const s=c.querySelector('.cs-selected');
    if(s)c.scrollTop=s.offsetTop-c.clientHeight/2+s.offsetHeight/2;
  });
}
function tsTpPick(opt,id,part){
  const inp=document.getElementById(id);if(!inp)return;
  const p=(inp.value||'09:00').split(':');
  if(part==='h')p[0]=opt.dataset.v;else p[1]=opt.dataset.v;
  inp.value=p[0]+':'+p[1];
  const drop=document.getElementById('csd-'+id);
  // Picking an hour fills the minute too, so the field is never half a time.
  drop.querySelectorAll('.ts-tp-col').forEach(function(c,i){
    const want=p[i];
    c.querySelectorAll('.cs-option').forEach(function(o){o.classList.toggle('cs-selected',o.dataset.v===want);});
  });
  const trig=document.querySelector('[data-csid="'+id+'"]');
  if(trig){trig.querySelector('.cs-value').textContent=inp.value;trig.classList.remove('cs-placeholder');}
  // The minute is the second and last choice, so it closes the list.
  if(part==='m'){drop.classList.remove('cs-open');if(trig)trig.classList.remove('cs-open');}
  tsEditPreview();
  // Other forms using this field (Announcements) listen here.
  if(typeof tsTpAfter==='function')tsTpAfter(id);
}
/* The form. Two times and a place — the same three facts the panel reads back
   above it, so entering a day and reading one are visibly the same record.
   The total under them is not a field: it is the arithmetic, shown live, so a
   typo in the hour is caught here and not in a payroll run. */
function buildTsEditHTML(dateStr){
  const att=tsAttendance[dateStr]||{};
  const inV=tsTo24(att.in),outV=tsTo24(att.out);
  const mins=(inV&&outV)?tsMins(outV)-tsMins(inV):0;
  // The app's standard dropdown (apCS), not a native <select>. It works in
  // labels, so tsSaveEdit maps the chosen label back to its TS_PLACES key.
  const locLabels=Object.keys(TS_PLACES).map(function(k){return TS_PLACES[k].label;});
  const locCur=(TS_PLACES[att.loc||'Hyderabad']||TS_PLACES.Hyderabad).label;
  return '<div class="ts-ed">'
    +'<div class="ts-ed-row">'
    +'<div class="ts-ed-f"><span class="ts-ed-lbl">Clock in</span>'+tsTimeField('ts-ed-in',inV)+'</div>'
    +'<div class="ts-ed-f"><span class="ts-ed-lbl">Clock out</span>'+tsTimeField('ts-ed-out',outV)+'</div>'
    +'</div>'
    // A <div>, not a <label>: a label forwards every click inside it to the
    // trigger button, which would reopen the list as an option is picked.
    +'<div class="ts-ed-f"><span class="ts-ed-lbl">Location</span>'
      +apCS('ts-ed-loc',locLabels,locCur,'Select location')+'</div>'
    /* What the day was spent on. Optional - it never blocks a save - and kept
       with the times because it is part of the same record. */
    +'<div class="ts-ed-f"><span class="ts-ed-lbl">Work Description</span>'
      +'<textarea id="ts-ed-desc" class="ts-ed-desc" maxlength="'+TS_DESC_MAX+'" oninput="tsDescCount()"'
        +' placeholder="What did you work on today? e.g. Built the export API, reviewed two pull requests">'+sbEsc(att.desc||'')+'</textarea>'
      +'<span class="ts-ed-count" id="ts-ed-count">'+(att.desc||'').length+' / '+TS_DESC_MAX+'</span></div>'
    /* WHY THE DAY IS BEING CHANGED. Required: a hand edit goes to the manager /
       HR as a Time Change request (All Timesheet › Requests), and the comment is
       what they read to decide it. The Work Description says what the day was
       spent on; this says why its times are being added or corrected. */
    +'<div class="ts-ed-f"><span class="ts-ed-lbl">Comment <span class="ts-ed-req">*</span></span>'
      +'<textarea id="ts-ed-comment" class="ts-ed-desc ts-ed-comment" maxlength="'+TS_COMMENT_MAX+'" oninput="tsCommentCount()"'
        +' placeholder="Why are you '+(att.status==='present'?'changing':'adding')+' this entry? e.g. Forgot to clock out after the client call"></textarea>'
      +'<span class="ts-ed-count" id="ts-ed-comment-count">0 / '+TS_COMMENT_MAX+'</span></div>'
    +'<div class="ts-ed-total"><span>Total</span><span id="ts-ed-total">'
      +(mins>0?(mins/60).toFixed(2):'0.00')+'h</span></div>'
    +'<div class="ts-ed-err" id="ts-ed-err"></div>'
    +'<div class="ts-ed-note">Saved by hand, this day is marked <b>Manual</b> on the grid.</div>'
    +'</div>';
}
function buildTsSidebarHTML(dateStr) {
  const att = tsAttendance[dateStr];
  const d = new Date(dateStr + 'T00:00:00');
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const mNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const label = String(d.getDate()).padStart(2,'0') + ' ' + mNames[d.getMonth()] + ' ' + d.getFullYear();
  const ci = att ? att.in : '--';
  const co = att ? att.out : '--';
  const loc = att ? att.loc : '--';
  const hrs = att ? att.hours : '0.00h';
  const src = att ? att.src : '';
  const clkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  const pinSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  const calSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const xSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const chevSvg = '<svg class="ts-loc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>';
  /* The location is the one field on this panel with something behind it, so
     it is the one field that is a control. Without a place to look up it stays
     plain text — a button that opens nothing is worse than no button. */
  const locRow = function(which,timeStr){
    const known = att && TS_PLACES[loc];
    if(!known) return '<div class="ts-sb-field">'+pinSvg+'<span class="ts-sb-flabel">Location</span><span class="ts-sb-fval">'+loc+'</span></div>';
    const open = tsMapOpen===which;
    return '<button class="ts-sb-field ts-sb-loc'+(open?' is-open':'')+'" onclick="tsToggleMap(\''+which+'\')" aria-expanded="'+open+'" title="'+(open?'Hide the map':'Show where this punch was recorded')+'">'
        +pinSvg+'<span class="ts-sb-flabel">Location</span><span class="ts-sb-fval">'+loc+'</span>'+chevSvg
      +'</button>'
      +(open?tsMapPanelHTML(loc,dateStr,which,timeStr):'');
  };
  /* WHAT THIS PANEL IS FOR DEPENDS ON THE DAY IT IS SHOWING. A day inside a
     locked week can only be read, and says why. A day of this month that has
     already happened can be corrected, or filled in if the clock never caught
     it. A day being filled in swaps the two read-only sections for the form —
     the panel does not grow a second place where a day is described. */
  const wk = tsWeekOf(dateStr);
  const unit = tsUnitOf(dateStr);
  const wkStatus = tsUnitStatus(unit);
  const wkMeta = tsWeekMeta[unit.key] || {};
  const editing = !!(tsEdit && tsEdit.date === dateStr);
  const editable = tsDayEditable(dateStr);
  const chip = tsWeekChipHTML(unit, wkStatus);
  /* A week reopened for correction says so above the controls - and a week
     sent back says WHY, in the approver's words, since that is the thing to
     fix. Both are editable, so they sit with Edit entry rather than replace it. */
  const wkNote = wkStatus === 'rejected'
    ? '<div class="ts-sb-wknote is-bad"><b>Week '+wk+' was sent back.</b>'
      + (wkMeta.reason ? ' “'+sbEsc(wkMeta.reason)+'”' : '')
      + ' Correct it, re-lock it, and resubmit just this week.</div>'
    : wkStatus === 'unlocked'
    ? '<div class="ts-sb-wknote"><b>Week '+wk+' is unlocked for correction.</b> Re-lock it from the week column when it is right.</div>'
    : '';

  /* WORK DESCRIPTION, only on a day with work on it. A leave day or an empty
     day has nothing to describe, so it is not invited to. */
  const worked = att && (att.status === 'present' || att.status === 'inprog');
  const workBlock = worked
    ? '<div class="ts-sb-work"><div class="ts-sb-work-title">'+TS_ICO.note+'Work Description</div>'
      + (att.desc
        ? '<div class="ts-sb-work-text">'+sbEsc(att.desc)+'</div>'
        : '<div class="ts-sb-work-text is-empty">No description added for this day.</div>')
      + '</div>'
    : '';
  const dayMax = (typeof csAtt !== 'undefined' && csAtt && +csAtt.dailyHours) || 8;
  const readBody = '<div class="ts-sb-section"><div class="ts-sb-sec-title"><div class="ts-sb-dot in"></div>Check In</div>'
    + '<div class="ts-sb-field">'+clkSvg+'<span class="ts-sb-flabel">Time</span><span class="ts-sb-fval">'+ci+'</span></div>'
    + locRow('in',ci)
    + '</div>'
    + '<div class="ts-sb-section"><div class="ts-sb-sec-title"><div class="ts-sb-dot out"></div>Check Out</div>'
    + '<div class="ts-sb-field">'+clkSvg+'<span class="ts-sb-flabel">Time</span><span class="ts-sb-fval">'+co+'</span></div>'
    + locRow('out',co)
    + '</div>'
    /* What was worked, beside the most the entity counts in a day — the Daily
       Work Hours set in Company Settings › Attendance. */
    + '<div class="ts-sb-total"><span class="ts-sb-total-txt"><span class="ts-sb-total-label">Actual Work Hours</span>'
      + '<span class="ts-sb-total-max">Max work hours: '+dayMax+'h</span></span>'
      + '<span class="ts-sb-total-val">'+(hrs==='--'?'0.00h':hrs)+'<span class="ts-sb-total-of"> / '+dayMax+'h</span></span></div>'
    + workBlock
    + (src ?'<div class="ts-sb-src">Source: <b>'+src+'</b></div>' : '');

  let actions = '';
  if (editing) {
    actions = '<div class="ts-sb-btns">'
      + '<button class="ts-sb-btn" onclick="tsCancelEdit()">Cancel</button>'
      + '<button class="ts-sb-btn is-primary" onclick="tsSaveEntry()">Save entry</button>'
      + '</div>';
  } else if (editable) {
    /* A CLOSED DAY IS CLAIMED, NOT ENTERED — and it is ONLY claimed. On a
       working day the clock either caught the hours or it did not, and Add
       entry fixes that on the spot. On a weekly off or a holiday the same
       hours need approval, so the request REPLACES Add entry rather than
       sitting above it: leaving both would have offered a way to write the
       times without anybody agreeing to them, which is the one thing the
       approval exists to prevent. */
    const arBlock = arDayPanelHTML(dateStr);
    actions = arBlock
      ? arBlock
      : '<button class="ts-sb-btn is-wide is-primary" onclick="tsStartEdit(\''+dateStr+'\')">'
        + (att ? TS_ICO.pen+'Edit entry' : TS_ICO.plus+'Add entry')+'</button>';
  } else if (!TS_EDITABLE[wkStatus]) {
    // Locked is not an error, so it is stated rather than warned about — and it
    // names the way back out, if this person has one.
    const how = tsUnitAuto(unit) ? ' locked automatically after '+tsFmtDay(tsUnitCutoff(unit))+'.' : ' is locked.';
    actions = '<div class="ts-sb-lockmsg">'+TS_ICO.lock
      + (wkStatus === 'submitted'
        ? '<span>Week '+wk+' has been submitted for approval'+(wkMeta.sub?' ('+wkMeta.sub+')':'')+'. Its days are read-only.</span>'
        : wkStatus === 'approved'
        ? '<span>Week '+wk+' has been approved. Its days are final.</span>'
        : '<span>Week '+wk+how+' '+(tsCanUnlock()
            ? 'Unlock it from the week column to correct this day.'
            : 'HR or a manager can unlock it for correction.')+'</span>')
      + '</div>';
  }
  actions = wkNote + actions;

  return '<div class="ts-sb-head">'
    + '<span class="ts-sb-title">Work Details</span>'
    + '<div class="ts-sb-head-right">'+chip
    + '<button class="ts-sb-close" onclick="tsCloseDay()">'+xSvg+'</button></div>'
    + '</div>'
    + '<div class="ts-sb-inner"'+(!att&&!editing&&typeof arNonWorkingDay==='function'&&arNonWorkingDay(dateStr)?' data-ar-claim="1"':'')+'>'
    + '<div class="ts-sb-date-box">'+calSvg+'<div><div class="ts-sb-date-val">'+label+'</div><div class="ts-sb-date-day">'+dayNames[d.getDay()]+'</div></div></div>'
    /* The state in words, under the date it belongs to. The grid carries it
       as a rail colour only; this is where it is spelled out, with the
       arithmetic that produced it. */
    + dsTagHTML(dateStr)
    /* A CLOSED DAY WITH NO PUNCH HAS NOTHING TO READ. Check In, Check Out and
       Total Hours were rendering as three boxes of dashes above the claim
       block — a report that the clock saw nothing on a day nobody was asked to
       work. The claim block below says everything there is to say; where a
       punch DOES exist (a badge still reads on a holiday) the sections come
       back, because then there is something to look at. */
    + (editing ? buildTsEditHTML(dateStr)
        : (!att && typeof arNonWorkingDay==='function' && arNonWorkingDay(dateStr) ? '' : readBody))
    + '<div class="ts-sb-actions">'+actions+'</div>'
    + '</div>';
}

function buildTsRangePickerHTML() {
  const preset = (kind, lbl) => '<button class="ts-rp-preset" onclick="tsRangePreset(\''+kind+'\',event)">'+lbl+'</button>';
  return '<div class="ts-mp-overlay" onclick="tsCloseRangePicker()"></div>'
    + '<div class="ts-rp-panel" onclick="event.stopPropagation()">'
    + '<div class="ts-rp-title">Date range</div>'
    + '<div class="ts-rp-fields">'
    /* <div>, not <label>: a <button> is a labelable element, so with the trigger
       inside a label every click in the open calendar would forward a second
       click to the trigger and shut the panel again. */
    + '<div class="ts-rp-fld"><span>From</span>'+apCD('ts-rp-from',tsRangeDraft.from,'Start date','tsRangeFrom')+'</div>'
    + '<div class="ts-rp-fld"><span>To</span>'+apCD('ts-rp-to',tsRangeDraft.to,'End date','tsRangeTo')+'</div>'
    + '</div>'
    + '<div class="ts-rp-presets">'+preset('month','Full month')+preset('first-half','1st–15th')+preset('second-half','16th–end')+'</div>'
    + '<div class="ts-rp-actions">'
    + '<button class="ts-rp-cancel" onclick="tsCloseRangePicker()">Cancel</button>'
    + '<button class="ts-rp-apply" onclick="tsApplyRange(event)">Apply</button>'
    + '</div></div>';
}

function buildTsMonthPickerHTML() {
  const mShortAll = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthsHtml = mShortAll.map(function(lbl, idx) {
    const isSel = tsMpYear === tsMonth.year && idx === tsMonth.month;
    return '<button class="ts-mp-month'+(isSel?' sel':'')+'" onclick="tsMpSelectMonth('+idx+',event)">'+lbl+'</button>';
  }).join('');
  return '<div class="ts-mp-overlay" onclick="tsCloseMonthPicker()"></div>'
    + '<div class="ts-mp-panel" onclick="event.stopPropagation()">'
    + '<div class="ts-mp-head">'
    + '<button class="ts-mp-nav" onclick="tsMpNavYear(-1,event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg></button>'
    + '<span class="ts-mp-year">'+tsMpYear+'</span>'
    + '<button class="ts-mp-nav" onclick="tsMpNavYear(1,event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg></button>'
    + '</div>'
    + '<div class="ts-mp-grid">'+monthsHtml+'</div>'
    + '<button class="ts-mp-this-month" onclick="tsMpThisMonth(event)">This month</button>'
    + '</div>';
}

/* The week column earns a third line. It already carried the week's number and
   its total; the control that closes the week off belongs with them, because
   locking is a statement ABOUT those seven days and nowhere else on the page
   is a week addressable.

   Each state shows only what is true of it - the moves are the legal ones and
   nothing else:
     open      a finished week can be locked (in order, see tsEarlierOpen)
     locked    can be ticked for submission; HR / a manager can unlock it
     unlocked  opened for correction; re-locked once it is right
     submitted waiting on the approver - nothing to do here
     approved  final, and billed from
     rejected  sent back with a reason; corrected, re-locked, resubmitted alone
   Somebody looking at another employee's sheet gets the state, plus unlock /
   re-lock if their role allows it. */
/* THE WEEK'S STATE IS A STATUS, SO IT IS DRAWN AS ONE — the app's own
   lp-status-badge, toned by who owes the next move (ts-billing.css): Locked
   idle, Unlocked info, Submitted wait, Approved ok, Rejected bad. What can be
   DONE to the week (Lock, Unlock, Re-lock) is a labelled button underneath,
   never a bare padlock beside the badge — a padlock next to "Locked" read as
   a second copy of the status rather than as the way to undo it. */
function tsWeekChipHTML(u,st){
  const meta=tsWeekMeta[u.key]||{};
  const c={
    locked:['idle',TS_ICO.lock+'Locked',tsUnitAuto(u)?'Locked automatically after '+tsFmtDay(tsUnitCutoff(u)):'Locked by hand'],
    unlocked:['idle',TS_ICO.unlock+'Unlocked','Unlocked for correction'],
    submitted:['wait','Submitted','Waiting on approval'+(meta.sub?' · '+meta.sub:'')],
    approved:['ok','Approved','Approved'+(meta.sub?' · '+meta.sub:'')],
    rejected:['bad','Rejected','Sent back'+(meta.reason?': '+meta.reason:'')]
  }[st];
  return c?'<span class="lp-status-badge tone-'+c[0]+' ts-wk-status" title="'+attrSafe(c[2])+'">'+c[1]+'</span>':'';
}
/* The tick that puts a locked week into the submission. It leads the week's
   label, the way a row's checkbox leads a table row, rather than hanging as a
   "Select" line under the status - so the rail reads label, total, status. */
function tsWeekPickHTML(w){
  const y=tsMonth.year,m=tsMonth.month,u=tsUnit(y,m,w);
  if(tsReadOnly||tsUnitStatus(u)!=='locked'||!tsUnitPickable(u))return '';
  return '<input type="checkbox" class="ts-wk-check"'+(tsSel[u.key]?' checked':'')
    +' title="'+(tsUnitSent(u)?'Resubmit just this week':'Select week '+w+' to submit')+'"'
    +' aria-label="Select week '+w+'" onchange="tsToggleSel(\''+u.key+'\','+y+','+m+','+w+')">';
}
/* "Select all", heading the week column the way a table's header checkbox
   heads its row checkboxes. Ticked when every pickable week is; absent when
   no week can be picked. */
function tsAllPickHTML(){
  const list=tsPickableWeeks();
  if(!list.length)return '';
  const n=list.filter(function(p){return tsSel[p.key];}).length;
  return '<input type="checkbox" class="ts-wk-check"'+(n===list.length?' checked':'')
      +' title="'+(n===list.length?'Clear selection':'Select all '+list.length+' locked week'+(list.length===1?'':'s'))+'"'
      +' aria-label="Select all weeks" onchange="tsToggleAllWeeks()">';
}
/* THE WEEK RAIL, AS DEEL AND MULTIPLIER SHOW A PERIOD: one status per week,
   and only the NEXT step in view.
     · the status is the week's badge, nothing beside it
     · the next step the employee owns — Lock a finished week, Re-lock a
       corrected one — is a light text action under it
     · what only HR or a manager does (Unlock for correction) is not repeated
       on every row; it lives in the week's "⋯" menu (tsWeekMenuHTML) */
function tsWeekRailHTML(w){
  const y=tsMonth.year,m=tsMonth.month,u=tsUnit(y,m,w),st=tsUnitStatus(u);
  const own=!tsReadOnly,admin=tsCanUnlock(),done=tsWeekStartable(y,m,w);
  const chip=tsWeekChipHTML(u,st);
  const act=function(label,title,primary){
    return '<button class="ts-wk-act'+(primary?' is-primary':'')+'" onclick="tsLockWeek('+w+')" title="'+attrSafe(title)+'">'+TS_ICO.lock+label+'</button>';
  };
  if(st==='open'){
    // A week still being worked has nothing to close off yet.
    if(!own||!done)return '';
    return act('Lock week','Lock '+tsUnitRange(u)+' now. Left alone it locks automatically after '+tsFmtDay(tsUnitCutoff(u))+'.');
  }
  if(st==='unlocked'||st==='rejected'){
    return chip+((own||admin)&&done?act('Re-lock','Lock week '+w+' again once it is corrected',true):'');
  }
  return chip;
}
/* The week's "⋯" menu: the actions only HR or a manager takes. Empty — and
   so not drawn — for everyone else and for weeks with nothing to do. */
let tsWkMenu=null;   // the week whose menu is open
function tsWeekMenuItems(w){
  const u=tsUnit(tsMonth.year,tsMonth.month,w);
  if(tsUnitStatus(u)==='locked'&&tsCanUnlock())
    return [{label:'Unlock for correction',icon:TS_ICO.unlock,call:'tsUnlockWeek('+w+')'}];
  return [];
}
function tsWeekMenuHTML(w){
  const items=tsWeekMenuItems(w);if(!items.length)return '';
  const open=tsWkMenu===w;
  return '<div class="ts-wk-more'+(open?' is-open':'')+'">'
    +'<button class="ts-wk-more-btn" onclick="tsToggleWkMenu(event,'+w+')" title="More actions for week '+w+'" aria-label="More actions" aria-expanded="'+open+'">'
      +'<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></button>'
    +(open?'<div class="ts-wk-pop" role="menu">'+items.map(function(it){
        return '<button role="menuitem" onclick="event.stopPropagation();tsWkMenu=null;'+it.call+'">'+it.icon+it.label+'</button>';
      }).join('')+'</div>':'')
  +'</div>';
}
function tsToggleWkMenu(ev,w){
  ev.stopPropagation();
  tsWkMenu=tsWkMenu===w?null:w;
  renderADTPage();
}
// A click anywhere else closes an open week menu.
document.addEventListener('click',function(){if(tsWkMenu!=null){tsWkMenu=null;renderADTPage();}});
/* Hours over the records a filter keeps, split into regular and overtime by
   the shift Attendance Settings defines (dsShift). See the Stats note below. */
/* THE GRID SHOWS A DAY UP TO THE DAILY WORK HOURS. Attendance Settings sets
   the expected day (dailyHours, 8 - the 09:00-18:00 window less the break).
   A day short of it shows what was worked; a day past it shows the full
   figure and no more. Anything over is still logged, still counts in the
   Total Hours / Overtime tiles, and is shown in full in the day panel. */
function tsDayCap(){return (typeof csAtt!=='undefined'&&+csAtt.dailyHours>0)?+csAtt.dailyHours:8;}
function tsDayHrsHTML(hours){
  const h=parseFloat(hours);
  if(isNaN(h))return '<span class="ts-day-hrs">'+hours+'</span>';
  const cap=tsDayCap();
  return '<span class="ts-day-hrs"'+(h>cap?' title="'+h.toFixed(2)+'h logged - open the day for the full hours"':'')+'>'+Math.min(h,cap).toFixed(2)+'h</span>';
}
function tsHourStats(keep){
  const s = dsShift(), shift = Math.max(0, (s.end - s.start) / 60);
  let total = 0, ot = 0, days = 0;
  Object.keys(tsAttendance).forEach(function(k){
    const a = tsAttendance[k];
    if (!keep(k) || !a || a.status !== 'present') return;
    const h = parseFloat(a.hours) || 0;
    const off = typeof arNonWorkingDay === 'function' && arNonWorkingDay(k);
    total += h; days++;
    ot += off ? h : Math.max(0, h - shift);
  });
  return {total: total, ot: ot, working: total - ot, days: days, shift: shift};
}
function buildMyTimesheetHTML(viewingOther) {
  // Somebody else's sheet is a record to read, not one to fill in.
  tsReadOnly = !!viewingOther;
  const emp = (viewingOther && atViewedEmp) ? atViewedEmp : tsEmp;
  const y = tsMonth.year, m = tsMonth.month;
  const cycle = tsCycle();          // Weekly | Biweekly | Semi-Monthly | Monthly, from the Sales Order
  const mNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const mShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mName = mNames[m];
  const firstDay = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  // One "today" for the whole feature — the grid, the editable test and the
  // week-lock test all read the same constant.
  const todayStr = TS_TODAY;
  const tp = TS_TODAY.split('-');
  const todayDate = new Date(+tp[0], +tp[1]-1, +tp[2]);

  // Mon-based offset for first day (0=Mon ... 6=Sun)
  let startDow = firstDay.getDay();
  const monOff = (startDow === 0) ? 6 : startDow - 1;

  // Stats follow the date-range filter — a filter the tiles ignore is a filter
  // that lies about what you are looking at. Worked out under ── Stats ──.

  // ── Filter bar ──
  const filterBar = '<div class="ts-filter-bar">'
    + '<span class="ts-filter-label">Select Filters</span>'
    + '<div class="ts-date-wrap">'
    + '<button class="ts-date-btn'+(tsRangeOpen?' open':'')+'" onclick="tsToggleRangePicker(event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'+tsFmtRange()+' <svg class="ts-date-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>'
    + (tsRangeOpen ? buildTsRangePickerHTML() : '')
    + '</div>'
    + '<button class="ts-btn-reset">Reset</button>'
    + '<button class="ts-btn-search">Search</button>'
    + '</div>';

  // ── User bar ──
  const userBar = '<div class="ts-user-bar">'
    + '<div class="ts-user-left"><div class="ts-user-av">'+emp.initials+'</div>'
    + '<div><div class="ts-user-name">'+emp.name+'</div><div class="ts-user-role">'+emp.role+'</div></div></div>'
    + '<div class="ts-user-right">'
    + '<button class="ts-refresh-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></button>'
    + '<div class="ts-month-wrap">'
    + '<button class="ts-month-btn" onclick="tsToggleMonthPicker(event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'+mName+' '+y+'<svg class="ts-date-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>'
    + (tsMpOpen ? buildTsMonthPickerHTML() : '')
    + '</div>'
    + '</div></div>';

  // The month's totals for the header, over the filtered range only.
  const dsTotals = dsMonthTotals(Object.keys(tsAttendance).concat(
    (function(){var out=[],dim=new Date(y,m+1,0).getDate();
     for(var d=1;d<=dim;d++)out.push(y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'));
     return out;})()
  ).filter(function(v,i,arr){return arr.indexOf(v)===i;}).filter(tsInRange));

  // ── Stats ──
  /* EVERY TILE IS ARITHMETIC ON THE SAVED RECORDS, so a Save changes them on
     the repaint that follows it - nothing waits for the week to be locked.
     "Total Working Hours" used to print a count of DAYS under an hours label,
     and Overtime was a constant 0h. Now:
       Total Hours          every hour logged in the range
       Overtime             hours past the shift on a working day, plus every
                            hour worked on a weekly off or holiday
       Total Working Hours  the two subtracted - the regular hours
     The cards show this month only - no comparison with the month before. */
  const cur = tsHourStats(function(k){ return tsInRange(k); });
  const statsHtml = '<div class="ts-stats">'
    + '<div class="ts-stat-card"><div class="ts-stat-top"><span class="ts-stat-label">Total Working Hours</span><div class="ts-stat-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div></div><div class="ts-stat-val">'+cur.working.toFixed(1)+'h</div><div class="ts-stat-sub">'+cur.days+' day'+(cur.days===1?'':'s')+' worked · '+mName+' '+y+'</div>'+'</div>'
    + '<div class="ts-stat-card"><div class="ts-stat-top"><span class="ts-stat-label">Leaves Taken</span><div class="ts-stat-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div></div><div class="ts-stat-val">'+dsTotals.leaves+'</div><div class="ts-stat-sub">'+(dsTotals.leaves?'Approved absences':'No leaves taken')+'</div>'+'</div>'
    + '<div class="ts-stat-card"><div class="ts-stat-top"><span class="ts-stat-label">Total Hours</span><div class="ts-stat-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div></div><div class="ts-stat-val">'+cur.total.toFixed(1)+'h</div><div class="ts-stat-sub">'+(cur.days?(cur.total/cur.days).toFixed(1)+'h average/day':'No hours logged')+'</div>'+'</div>'
    + '<div class="ts-stat-card"><div class="ts-stat-top"><span class="ts-stat-label">Overtime</span><div class="ts-stat-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div></div><div class="ts-stat-val">'+cur.ot.toFixed(1)+'h</div><div class="ts-stat-sub">Past the '+cur.shift.toFixed(0)+'h shift, or on an off day</div>'+'</div>'
    + '</div>';

  // ── Calendar ──
  const eyeSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  let calRows = '';
  const tsHasPick = tsPickableWeeks().length > 0; // the selection column shows only when a week can be ticked
  const totalWeeks = Math.ceil((monOff + daysInMonth) / 7);

  for (let w = 0; w < totalWeeks; w++) {
    // The rail used to hold a checkbox that was wired to nothing. A week's
    // total is the figure people actually scan a timesheet for, so it goes
    // there instead and the column starts earning its width.
    let wkHours = 0, wkShown = 0;   // logged, and as the grid shows it (each day capped)
    const wkDays = {};
    for (let c = 0; c < 7; c++) {
      const dn = w * 7 + c + 1 - monOff;
      if (dn < 1 || dn > daysInMonth) continue;
      const ds = y+'-'+String(m+1).padStart(2,'0')+'-'+String(dn).padStart(2,'0');
      if (!tsInRange(ds)) continue;
      wkDays[ds] = 1;
      const a = tsAttendance[ds];
      if (a && a.status === 'present') { wkHours += parseFloat(a.hours); wkShown += Math.min(parseFloat(a.hours) || 0, tsDayCap()); }
    }
    /* Of the week's hours, how many are overtime — the split Deel bills on
       (regular vs overtime). Same rule as the Overtime tile (tsHourStats), so
       the rail and the tile cannot disagree. Said only when there is some. */
    /* On Weekly billing a row at either end of the month can be half of a
       week that carries on in the next (or began in the last) month. The grid
       still draws only this month's days - the rest are not repeated here -
       but the rail says where the billing week really runs, because Lock
       and Submit act on all seven days. */
    const unit = tsUnit(y, m, w+1);
    const uFirst = unit.dates[0], uLast = unit.dates[unit.dates.length-1];
    const mKey = y+'-'+String(m+1).padStart(2,'0');
    const spanTxt = uLast.slice(0,7) !== mKey ? 'to '+tsUnitRange(unit).split(' – ')[1]
      : uFirst.slice(0,7) !== mKey ? 'from '+tsUnitRange(unit).split(' – ')[0] : '';
    // A locked week's empty total reads 0, not a dash: the week is settled and
    // nothing was logged. It is a display value - nothing is written.
    const wkLocked = !TS_EDITABLE[tsUnitStatus(unit)];
    const wkPick = tsWeekPickHTML(w+1);
    const wkPicked = wkPick && tsSel[unit.key];
    // Selection has its own column on the far left, apart from the week's
    // figures - the way a table puts its row checkboxes in a column of their own.
    // A submitted week is out of the employee's hands until it is decided, so its
    // days fade back; the week column keeps its status in full.
    calRows += '<div class="ts-cal-row'+(tsHasPick?' has-pick':'')+(wkPicked?' is-picked':'')+(tsUnitStatus(unit)==='submitted'?' is-submitted':'')+'">';
    if (tsHasPick) calRows += '<div class="ts-pick-cell">'+wkPick+'</div>';
    calRows += '<div class="ts-week-cell'+(wkPicked?' is-picked':'')+'">'
      + '<span class="ts-wk-label">Week '+(w+1)+'</span>'
      + '<span class="ts-wk-total'+(wkHours?'':' none')+'"'+(wkHours>wkShown+0.004?' title="'+wkHours.toFixed(2)+'h logged in total - open a day for its full hours"':'')+'>'+(wkHours?wkShown.toFixed(2)+'h':wkLocked?'0.00h':'&mdash;')+'</span>'
      + (spanTxt ? '<span class="ts-wk-span" title="This billing week runs '+tsUnitRange(unit)+'">'+spanTxt+'</span>' : '')
      + tsWeekRailHTML(w+1)
      + tsWeekMenuHTML(w+1)
      + '</div>';
    for (let col = 0; col < 7; col++) {
      const dayNum = w * 7 + col + 1 - monOff;
      const isWe = col >= 5;
      if (dayNum < 1 || dayNum > daysInMonth) {
        calRows += '<div class="ts-day-cell ts-empty'+(isWe?' we':'')+'"></div>';
        continue;
      }
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      const dateStr = y + '-' + mm + '-' + dd;
      const isToday = dateStr === todayStr;
      const isFuture = new Date(y, m, dayNum) > todayDate;
      const att = tsAttendance[dateStr];
      const isSel = tsSelectedDay === dateStr;

      let cellCls = 'ts-day-cell';
      if (isWe) cellCls += ' we';
      if (isToday) cellCls += ' is-today';
      if (isSel) cellCls += ' is-selected';
      if (isFuture) cellCls += ' future';
      // Weekend days can carry real logged hours (overtime). The grid used to
      // test isWe before the data and render those as blank "Weekend" cells,
      // so worked Saturdays vanished here while still counting in the stat
      // tiles above. Data wins; the tinted column still marks it as a weekend.
      const inRange = tsInRange(dateStr);
      if (!inRange) cellCls += ' out-of-range';
      if (inRange && att) cellCls += ' st-'+(att.status === 'inprog' ? 'inprog' : att.status === 'present' ? 'present' : 'absent');
      else if (inRange && !isWe && !isFuture) cellCls += ' st-absent';

      /* Every past day of the month opens now, weekends included: a Saturday
         with no punch on it is exactly the day somebody needs to add hours to,
         and it used to be the one cell you could not click. */
      const clickable = inRange && !isFuture;
      if (clickable) cellCls += ' is-clickable';
      const dayLocked = inRange && tsDayLocked(dateStr);
      if (dayLocked) cellCls += ' is-locked';
      // The rail says how the shift was kept — the grid's only status mark.
      if (inRange) cellCls += dsRailClass(dateStr);
      // A closed day carrying a claim gets the amber rail its chip is, so a
      // month can be scanned for them without reading a cell. See js/attendance-request.js.
      const arReq = inRange ? arGet(dateStr) : null;
      if (arReq && arReq.status === 'Pending Approval') cellCls += ' ar-pending';
      const clickH = clickable ? ' onclick="tsOpenDay(\''+dateStr+'\')"' : '';

      /* The grid shows worked hours and nothing else - the figure saved in the
         day panel. Leave, absence, holidays, late / early flags and claims all
         live in that panel, one click away, not on the cell. */
      let body = '';
      if (inRange && !isFuture && att && (att.status === 'present' || att.status === 'inprog') && att.hours !== '--')
        body = tsDayHrsHTML(att.hours);
      /* LOCKED, AND NOTHING LOGGED: the hours read 0 rather than blank, so a
         settled week has a figure in every box. Display only - no record is
         created, and it is greyed so it never reads as entered time. */
      if (dayLocked && !isFuture && (!att || att.status === 'absent'))
        body = '<span class="ts-day-hrs is-zero" title="No hours recorded">0.00h</span>';

      // The whole cell already opens the day panel, so the per-cell "View"
      // link was twenty copies of the affordance the cursor gives for free.
      // It becomes an icon that only surfaces on hover.
      // The hover glyph says which of the two the cell is: a day you can open
      // and change, or one the week lock has closed.
      calRows += '<div class="'+cellCls+'"'+clickH+(clickH?' title="'+(dayLocked?'Locked — ':'')+dd+' '+mName+'"':'')+'>'
        + '<span class="ts-day-num'+(isToday?' today':'')+'">'+dd+'</span>'
        + body
        + (clickH ? '<span class="ts-day-peek">'+(dayLocked?TS_ICO.lock:eyeSvg)+'</span>' : '')
        + '</div>';
    }
    calRows += '</div>';
  }

  const calHtml = '<div class="ts-cal-card">'
    + '<div class="ts-cal-head">'
    + '<div class="ts-cal-title">'+mName+' '+y+arHeaderChipHTML()
      /* Which way this sheet is billed decides what Lock and Submit act on, so
         it is named where the grid starts. It is set on the Sales Order, not
         here - the chip says where. */
      // The app's own status badge (lp-status-badge), in the neutral tone: a fact
      // about the sheet, not a state anyone owes a move on.
      + (tsOrder() ? '<span class="lp-status-badge tone-idle ts-cycle-chip" title="Set on Sales Order #'+tsOrder().orderId+' › Sales Details › Payment Cycle">'+cycle+' billing · Order #'+tsOrder().orderId+'</span>' : '')
      + '</div>'
    /* The header carries the month's totals and the FOOT carries the key. The
       four-item legend used to sit up here beside the month name, which put
       the explanation of the grid above the grid and left no room to say what
       any of the four terms meant. See js/day-status.js. */
    + '<div class="ds-totals">'
      + '<span class="ds-total">Total working days <b>'+dsTotals.working+'</b></span>'
      + '<span class="ds-total">Leaves taken <b>'+dsTotals.leaves+'</b></span>'
    + '</div></div>'
    + '<div class="ts-col-hdrs'+(tsHasPick?' has-pick':'')+'">'+(tsHasPick?'<div class="ts-col-hdr ts-pick-hdr">'+tsAllPickHTML()+'</div>':'')+'<div class="ts-col-hdr">WEEK</div><div class="ts-col-hdr">MON</div><div class="ts-col-hdr">TUE</div><div class="ts-col-hdr">WED</div><div class="ts-col-hdr">THU</div><div class="ts-col-hdr">FRI</div><div class="ts-col-hdr we">SAT</div><div class="ts-col-hdr we">SUN</div></div>'
    + calRows
    + '</div>';

  // ── Fixed overlay sidebar ──
  const overlayHTML = tsSelectedDay
    ? '<div class="ts-overlay">'
      + '<div class="ts-overlay-bg"></div>'
      + '<div class="ts-overlay-panel">'+buildTsSidebarHTML(tsSelectedDay)+'</div>'
      + '</div>'
    : '';

  /* THE FOOTER FOLLOWS THE PAYMENT CYCLE.
     Weekly - each locked week is ticked in its own rail and goes as its own
              period; the footer counts the ticks.
     Biweekly / Semi-Monthly / Monthly - one box per billing period touching
              this month ("Select Entire Month"; "1 – 15 Jun", "16 – 30 Jun";
              "8 Jun – 21 Jun"…) and one Submit. A box only ticks once that
              period's weeks are locked, and when it cannot it says which
              weeks are holding it up. A week sent back and corrected is
              ticked on its own ("Resubmit") and goes alone. */
  const tally={};
  for(let wi=1;wi<=totalWeeks;wi++){const st=tsWeekStatus(y,m,wi);tally[st]=(tally[st]||0)+1;}
  const picked=Object.keys(tsSel).length;
  const tallyTxt=['submitted','approved','rejected'].filter(function(k){return tally[k];})
    .map(function(k){return tally[k]+' '+k;}).join(' · ');
  let footLead='';
  const periods=cycle==='Weekly'?[]:tsPeriodsInMonth(y,m);
  const perChk=periods.map(function(p){return {p:p,c:tsPeriodCheck(p)};});
  const perPicked=perChk.filter(function(x){return x.c.ok&&tsPerSel[x.p.key];});
  if(!tsReadOnly&&periods.length){
    footLead=perChk.map(function(x){
      const lbl=cycle==='Monthly'?'Select Entire Month':x.p.label;
      return '<label class="ts-month-pick'+(x.c.ok?'':' is-off')+'" title="'+attrSafe(x.c.ok?'Submit '+tsDayLbl(x.p.from)+' – '+tsDayLbl(x.p.to)+' as one '+cycle.toLowerCase()+' period':x.c.reason)+'">'
        +'<input type="checkbox"'+(tsPerSel[x.p.key]&&x.c.ok?' checked':'')+(x.c.ok?'':' disabled')+' onchange="tsTogglePeriodSel(\''+x.p.key+'\')">'
        +'<span>'+lbl+'</span></label>';
    }).join('');
    // One sentence for the lot: what is ticked, or what is holding a period up —
    // preferring one still to send over one already sent.
    const first=perChk.find(function(x){return !x.c.ok&&x.c.units.length;})||perChk.find(function(x){return !x.c.ok;});
    footLead+='<span class="ts-foot-note">'+cycle+' billing · '
      +(perPicked.length?perPicked.length+' period'+(perPicked.length===1?'':'s')+' selected'
        :perChk.some(function(x){return x.c.ok;})?'Tick a period to submit it':(first?first.c.reason:''))
      +(picked?' · '+picked+' corrected week'+(picked===1?'':'s')+' to resubmit':'')
      +(tallyTxt?' · '+tallyTxt:'')+'</span>';
  }else if(!tsReadOnly){
    footLead='<span class="ts-foot-note">'
      +(picked?picked+' week'+(picked===1?'':'s')+' selected':(tally.locked?'Tick a locked week to submit it':'Lock a finished week to submit it'))
      +(tallyTxt?' · '+tallyTxt:'')+'</span>';
  }
  /* WHAT IS ABOUT TO GO: once something is ticked, the hours in it, split into
     regular and overtime — Multiplier shows this summary the moment dates are
     selected, so the approver's number is seen before it is sent. Counted over
     every day of the ticked weeks / periods, each day once. */
  const selDays = {};
  Object.keys(tsSel).forEach(function(k){ const s=tsSel[k]; tsUnit(s.y,s.m,s.w).dates.forEach(function(d){ selDays[d]=1; }); });
  perPicked.forEach(function(x){ x.c.units.forEach(function(u){ u.dates.forEach(function(d){
    if (d >= x.p.from && d <= x.p.to) selDays[d]=1; }); }); });
  const selStats = Object.keys(selDays).length ? tsHourStats(function(k){ return selDays[k]; }) : null;
  const selSum = selStats && !tsReadOnly
    ? '<span class="ts-foot-sum">To submit <b>'+selStats.total.toFixed(2)+'h</b>'
      +'<span>Regular '+selStats.working.toFixed(2)+'h</span><span>Overtime '+selStats.ot.toFixed(2)+'h</span></span>'
    : '';
  const footNote = footLead + selSum;
  /* Submit appears only once there is something to submit: a ticked week, or
     on the other cycles a billing period ticked. With nothing picked the button
     could only answer with an error, so the note beside it does the talking. */
  const canSubmit = !tsReadOnly && (picked > 0 || perPicked.length > 0);

  const backBar = viewingOther
    ? '<div class="ts-back-bar"><button class="ep-back" onclick="atBackToAllTimesheet()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to All Timesheet</button></div>'
    : '';

  return '<div class="ts-main">'
    + backBar
    + filterBar
    + userBar
    + statsHtml
    + calHtml
    + '<div class="ts-footer">'+footNote
      +(canSubmit?'<button class="ts-submit-btn" onclick="tsSubmitLockedWeeks()">Submit for Approval</button>':'')+'</div>'
    + '</div>'
    + overlayHTML;
}
// ── ALL TIMESHEET PAGE ──
/* ── All Timesheet: row detail panel ──────────────────────────────────────
   The same split panel every other listing uses — .lp-split-wrap for the
   layout, .lp-isb-* for the tab bar, isbTab() for the body-only swap — so this
   page behaves like the rest of the app rather than growing its own idea of
   what a detail view is. Two tabs: what the employee has FILED, and what they
   have been PAID. */
function openAtSidebar(id,tab){
  if(id!==atSelectedId&&typeof atReqFilter!=='undefined')atReqFilter='';
  atTab=tab||sbKeepTab(atSelectedId,atTab,'timesheet');atSelectedId=id;
  const sb=document.getElementById('at-split-sb');if(sb)sb.classList.add('open');
  const wrap=document.getElementById('at-split-wrap');if(wrap)wrap.classList.add('has-sb');
  isbTab('at',renderAtSidebar);
  document.querySelectorAll('.at-tr').forEach(function(r){
    r.classList.toggle('lp-row-selected',r.id==='at-row-'+id);
  });
}
function closeAtSidebar(){
  atSelectedId=null;
  const sb=document.getElementById('at-split-sb');if(sb)sb.classList.remove('open');
  const wrap=document.getElementById('at-split-wrap');if(wrap)wrap.classList.remove('has-sb');
  document.querySelectorAll('.at-tr').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navAtTab(tab){atTab=tab;isbTab('at',renderAtSidebar);}

function renderAtSidebar(){
  const emp=atEmp(atSelectedId);if(!emp)return'';
  const tabs=[{id:'timesheet',label:'Timesheet'},{id:'salary',label:'Salary'},{id:'payslips',label:'Payslips'},
    // The dot says something is waiting before the tab is opened. js/at-requests.js
    {id:'requests',label:'Requests',dot:atReqDotHTML(emp.empId,'at-tab-dot')}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<div class="lp-isb-tabs" id="at-isb-tabs">'+tabs.map(function(t){
      return '<button class="lp-isb-tab'+(atTab===t.id?' active':'')+'" onclick="navAtTab(\''+t.id+'\')">'+t.label+(t.dot||'')+'</button>';
    }).join('')+'</div>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeAtSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';

  /* One identity strip above both tabs, not one per tab. Whose record this is
     does not change when you switch between what they filed and what they were
     paid, so it does not get re-stated — and the month it names is the month
     the page is filtered to, which is what makes both lists mean anything. */
  const iUser='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iCal='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const period=atPeriod();
  /* The panel's one header is the standard sbHero. A custom strip here made
     the shared panel code add its own hero above it as well, so the name was
     printed twice. The month rides in the meta line instead. */
  const head=sbHero({icon:iUser,name:emp.name,
    meta:[emp.empId,'<span class="at-sb-period">'+iCal+period.label+' · '+period.from+' &rarr; '+period.to+'</span>'],
    status:sbHeroBadge(emp.empStatus)});

  const thS='padding:9px 12px;text-align:left;font-size:10.5px;font-weight:600;color:#6b7280;background:#f8fafc;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap';
  const tdS='padding:11px 12px;font-size:12.5px;color:var(--navy);border-bottom:1px solid #f1f3f5';
  const empty=function(cols,msg){
    return '<tr><td colspan="'+cols+'" style="padding:26px 12px;text-align:center;font-size:12.5px;color:#9ca3af">'+msg+'</td></tr>';
  };

  let body='';
  if(atTab==='timesheet'){
    const rows=atSheets(emp.empId);
    const eyeIco='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    const list=rows.length?rows.map(function(s,i){
      return '<tr>'
        +'<td style="'+tdS+';color:var(--gray)">'+(i+1)+'</td>'
        +'<td style="'+tdS+';font-weight:600">'+s.sheetId+'</td>'
        +'<td style="'+tdS+';white-space:nowrap">'+s.start+'</td>'
        +'<td style="'+tdS+';white-space:nowrap">'+s.end+'</td>'
        +'<td style="'+tdS+';font-size:11.5px;color:#64748b;white-space:nowrap">'+s.created+'</td>'
        +'<td style="'+tdS+'"><span class="lp-status-badge tone-'+statusTone(s.status)+'">'+s.status+'</span></td>'
        +'<td style="'+tdS+';text-align:center"><button class="at-sb-icon-btn" title="View timesheet" '
          +'onclick="atViewCalendar(\''+emp.empId+'\',\''+attrSafe(emp.name)+'\',\''+emp.initials+'\',\''+attrSafe(emp.role)+'\')">'+eyeIco+'</button></td>'
        +'</tr>';
    }).join(''):empty(7,'No timesheets found');
    body='<div class="at-sb-table-wrap"><table class="at-sb-table">'
      +'<thead><tr>'
      +'<th style="'+thS+'">S.No</th><th style="'+thS+'">Sheet ID</th><th style="'+thS+'">Week Start</th>'
      +'<th style="'+thS+'">Week End</th><th style="'+thS+'">Create Time</th><th style="'+thS+'">Status</th>'
      +'<th style="'+thS+';text-align:center">Details</th>'
      +'</tr></thead><tbody>'+list+'</tbody></table></div>';
  }else if(atTab==='salary'){
    body=atSalTabHTML(emp);   // js/at-salary.js
  }else if(atTab==='requests'){
    body=atReqTabHTML(emp);   // js/at-requests.js
  }else{
    const slips=atPayslips(emp.empId);
    const dlIco='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    const pdfIco='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    const iInfo='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    const list=slips.length?slips.map(function(p,i){
      return '<tr>'
        +'<td style="'+tdS+';color:var(--gray)">'+(i+1)+'</td>'
        +'<td style="'+tdS+';font-weight:600">'+p.name+'</td>'
        +'<td style="'+tdS+'"><span class="at-sb-file">'+pdfIco+'PDF &middot; '+p.size+'</span></td>'
        +'<td style="'+tdS+';white-space:nowrap">'+p.month+'</td>'
        +'<td style="'+tdS+';text-align:center"><button class="at-sb-icon-btn" title="Download '+attrSafe(p.name)+'" '
          +'onclick="atSalViewSlip(\''+emp.empId+'\',\''+p.month.slice(0,3)+'\')">'+dlIco+'</button></td>'
        +'</tr>';
    }).join(''):empty(5,'No payslips found');
    // Said once, above the list, because a capped list that does not admit it
    // is indistinguishable from a complete one.
    const note='<div class="at-sb-note">'+iInfo+'<span>Showing last '+AT_PAYSLIP_LIMIT
      +' salary slips (most recent first).</span></div>';
    body=note+'<div class="at-sb-table-wrap"><table class="at-sb-table">'
      +'<thead><tr>'
      +'<th style="'+thS+'">Sr. No</th><th style="'+thS+'">Attachment Name</th><th style="'+thS+'">Attach File</th>'
      +'<th style="'+thS+'">Month-Year</th><th style="'+thS+';text-align:center">Action</th>'
      +'</tr></thead><tbody>'+list+'</tbody></table></div>';
  }
  return tabBar+'<div class="lp-isb-body">'+head+body+'</div>';
}
// The month the page is filtered to, resolved to a real range. Both tabs read
// against it, so the panel can never describe a period the list is not for.
function atPeriod(){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const picked=atMonth||AT_DEFAULT_MONTH;
  let m=months.indexOf(picked);if(m<0)m=7;
  const yr=2026,pad=function(n){return n<10?'0'+n:''+n;};
  const last=new Date(yr,m+1,0).getDate();
  return {label:picked,from:yr+'-'+pad(m+1)+'-01',to:yr+'-'+pad(m+1)+'-'+pad(last)};
}
function atToggleTsFilter(v){
  atTsQuickFilter=v===''?'':(atTsQuickFilter===v?'':v);
  renderADTPage();
}
function applyAtFilters(){
  const ts=getCSValue('at-f-ts');
  atTsQuickFilter=ts&&ts!=='Timesheet Status'&&ts!=='All'?ts:'';
  atSearchQuery=lpSearchValue('at-f-q');
  atMonth=getCSValue('at-f-month')||atMonth;
  renderADTPage();
}
function resetAtFilters(){
  atTsQuickFilter='';atSearchQuery='';atMonth=AT_DEFAULT_MONTH;
  renderADTPage();
}
function buildAllTimesheetHTML(){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const data=allTsData;
  const unfilled=data.filter(d=>d.tsStatus==='Unfilled').length;
  const filled=data.filter(d=>d.tsStatus==='Filled').length;
  const total=data.length;

  const calIco='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const salIco='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 0 0 0-10"/></svg>';
  // Where this month's pay stands for the row, read from the same record the
  // Salary tab edits — so the column and the panel always agree.
  const salBadge=function(emp){
    if(!AT_PAY[emp.empId])return '<span style="color:var(--gray)">—</span>';
    const r=atSalRec(emp.empId);
    return '<span class="lp-status-badge tone-'+atSalTone(r)+'">'+atSalStatusLabel(r)+'</span>';
  };
  const listIco='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';

  // Filter bar
  const filterBar='<div class="at-top">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('at-f-q',atSearchQuery,'Search employee','applyAtFilters()')
    +apCS('at-f-status',['Active','Inactive','All'],'','Status')
    +apCS('at-f-admin',['Admin Name'],'','Admin Name')
    +apCS('at-f-ts',['Unfilled','Filled','All'],atTsQuickFilter,'Timesheet Status')
    +apCS('at-f-month',months,atMonth,'Month')
    +clearFiltersBtn([atTsQuickFilter,atSearchQuery],'resetAtFilters()')
    +'<button class="lp-pill-search" onclick="applyAtFilters()">Search</button>'
    // Export after Search, as on Employees: narrow the list, then take it away.
    // The 'all' scope of the timesheet export picks employees from this list.
    +tsxExportBtn('all')
    +'</div></div>'
    +'<div class="listing-stats">'
    +'<div class="listing-stat'+(atTsQuickFilter==='Unfilled'?' stat-selected':'')+'" onclick="atToggleTsFilter(\'Unfilled\')"><div class="listing-stat-count" style="color:var(--st-bad-fg)">'+unfilled+'</div><div class="listing-stat-label">Unfilled</div></div>'
    +'<div class="listing-stat'+(atTsQuickFilter==='Filled'?' stat-selected':'')+'" onclick="atToggleTsFilter(\'Filled\')"><div class="listing-stat-count" style="color:var(--st-ok-fg)">'+filled+'</div><div class="listing-stat-label">Filled</div></div>'
    +'<div class="listing-stat'+(atTsQuickFilter===''?' stat-selected':'')+'" onclick="atToggleTsFilter(\'\')"><div class="listing-stat-count" style="color:var(--navy)">'+total+'</div><div class="listing-stat-label">Total</div></div>'
    +'</div>'
    +'</div>';

  // Table rows
  const filteredTs=atTsQuickFilter?data.filter(function(d){return d.tsStatus===atTsQuickFilter;}):data;
  const pgn=listPage('all-timesheet',atTsQuickFilter+'|'+atSearchQuery,lpSearchRows(filteredTs,atSearchQuery).map(function(emp){
    const empBadge=emp.empStatus==='Active'
      ?'<span class="at-badge-active">Active</span>'
      :'<span class="at-badge-inactive">Inactive</span>';
    const tsBadge=emp.tsStatus==='Filled'
      ?'<span class="at-badge-filled">Filled</span>'
      :'<span class="at-badge-unfilled">Unfilled</span>';
    // The row opens the panel; the two buttons keep their separate jobs —
    // calendar goes to the full month view, details opens the panel in place.
    return '<tr class="at-tr'+(atSelectedId===emp.empId?' lp-row-selected':'')+'" id="at-row-'+emp.empId+'"'
      +' style="cursor:pointer" onclick="openAtSidebar(\''+emp.empId+'\')">'
      +'<td class="at-td"><span class="at-sno">'+emp.id+'</span></td>'
      +'<td class="at-td"><span class="at-emp-id">'+emp.empId+'</span></td>'
      +'<td class="at-td"><span class="at-emp-name">'+emp.name+'</span></td>'
      +'<td class="at-td">'+emp.country+'</td>'
      +'<td class="at-td">'+empBadge+'</td>'
      +'<td class="at-td">'+tsBadge+'</td>'
      +'<td class="at-td">'+salBadge(emp)+'</td>'
      +'<td class="at-td" onclick="event.stopPropagation()"><div class="at-actions">'
      +'<button class="at-act-btn" title="View Calendar" onclick="atViewCalendar(\''+emp.empId+'\',\''+emp.name+'\',\''+emp.initials+'\',\''+emp.role+'\')">'+calIco+'</button>'
      +'<button class="at-act-btn" title="Get Salary" onclick="openAtSidebar(\''+emp.empId+'\',\'salary\')">'+salIco+'</button>'
      +'<button class="at-act-btn" title="View Details" onclick="openAtSidebar(\''+emp.empId+'\')">'+listIco+atReqDotHTML(emp.empId,'at-req-dot at-act-dot')+'</button>'
      +'</div></td>'
      +'</tr>';
  }),'<tr><td class="at-td" colspan="8" style="padding:24px;text-align:center;color:var(--gray)">No timesheets match this filter.</td></tr>');
  // A panel must belong to a row you can still see.
  if(atSelectedId&&!filteredTs.some(function(e){return e.empId===atSelectedId;}))atSelectedId=null;

  // Wrapped in the shared split so the panel pushes the table rather than
  // floating over it — same as every other listing with a detail view.
  const table='<div class="lp-split-wrap at-split-wrap'+(atSelectedId?' has-sb':'')+'" id="at-split-wrap">'
    +'<div class="lp-split-main"><div class="at-card">'
    +'<table class="at-table">'
    +'<thead><tr>'
    +'<th class="at-th">S. No</th>'
    +'<th class="at-th">Employee ID</th>'
    +'<th class="at-th">Name</th>'
    +'<th class="at-th">Country</th>'
    +'<th class="at-th">Employee Status</th>'
    +'<th class="at-th">Timesheet Status</th>'
    +'<th class="at-th">Salary ('+atMonth+')</th>'
    +'<th class="at-th">Action</th>'
    +'</tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody>'
    +'</table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(atSelectedId?' open':'')+'" id="at-split-sb">'
      +'<div class="lp-isb" id="at-isb-inner">'+(atSelectedId?sbRender(renderAtSidebar,'at'):'')+'</div></div>'
    +'</div>';

  return filterBar+table;
}

// ── AGENT MODE GRADIENT ──
let _amRaf=null,_amRenderer=null,_amResizeFn=null;
function stopAmThreeJS(){
  if(_amRaf){cancelAnimationFrame(_amRaf);_amRaf=null;}
  if(_amResizeFn){window.removeEventListener('resize',_amResizeFn);_amResizeFn=null;}
  if(_amRenderer){try{_amRenderer.dispose();}catch(e){} _amRenderer=null;}
}
function initAmThreeJS(){
  if(!document.getElementById('am-webgl-canvas'))return;
  if(window.THREE){_startAmThreeJS();return;}
  const s=document.createElement('script');
  s.src='https://unpkg.com/three@0.134.0/build/three.min.js';
  s.onload=function(){if(document.getElementById('am-webgl-canvas'))_startAmThreeJS();};
  s.onerror=function(){console.warn('Three.js CDN unavailable');};
  document.head.appendChild(s);
}
function _startAmThreeJS(){
  const canvas=document.getElementById('am-webgl-canvas');
  if(!canvas||!window.THREE)return;
  stopAmThreeJS();
  const w=canvas.offsetWidth||window.innerWidth;
  const h=canvas.offsetHeight||window.innerHeight;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false});
  renderer.setSize(w,h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.autoClear=false;
  _amRenderer=renderer;
  // Single ortho scene — full-screen soft warm plasma
  const scene=new THREE.Scene();
  const cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const AM_FS=`
uniform vec2 u_res;
uniform float u_t;
float rng(vec2 s){return fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453);}
vec3 m3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 m4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return m4(((x*34.)+1.)*x);}
vec4 tinv(vec4 r){return 1.7928429-0.8537347*r;}
float sn(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=m3(i);
  vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n=.142857;vec3 ns=n*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 xs=x_*ns.x+ns.yyyy;vec4 ys=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(xs)-abs(ys);
  vec4 b0=vec4(xs.xy,ys.xy);vec4 b1=vec4(xs.zw,ys.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 nr=tinv(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=nr.x;p1*=nr.y;p2*=nr.z;p3*=nr.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
void main(){
  vec2 r=u_res;vec2 FC=gl_FragCoord.xy;
  vec2 p=(FC*2.-r)/r.y;vec2 lv=vec2(0.);
  lv.x+=abs(.5-dot(p,p))*.35;
  vec2 v=p*(1.-lv.x)/2.8;
  v+=vec2(sn(vec3(p*1.5,u_t*.07))*.4,sn(vec3(p*1.5+8.,u_t*.07))*.28);
  vec4 o=vec4(0.);
  for(float i=0.;i<10.;i++){
    float idx=i+1.;
    v+=cos(v.yx*idx+vec2(0.,idx)+u_t)/idx+3.5;
    o+=(sin(vec4(v.x,v.y,v.y,v.x))+1.)*abs(v.x-v.y)*.09;
  }
  o=o.wxyz*.85+o*.15;
  vec4 ep=exp(p.y*vec4(-.3,-.6,.15,0.));
  float el=exp(-1.2*lv.x);
  vec4 rt=ep*el/max(o,vec4(.001));
  vec4 e2=exp(clamp(2.*rt,-12.,12.));
  o=(e2-1.)/(e2+1.);
  o=clamp(o,0.,1.);
  // Soft warm light palette — very subtle aurora on near-white
  vec3 warm=vec3(1.,.965,.93);
  vec3 cool=vec3(.945,.945,1.);
  vec3 base=vec3(.975,.975,.99);
  vec3 c=mix(base,warm,o.r*.28);
  c=mix(c,cool,o.b*.18);
  c+=vec3(o.r*.012,0.,o.b*.008);
  c=clamp(c,.89,1.);
  gl_FragColor=vec4(c,1.);
}`;
  const mat=new THREE.ShaderMaterial({
    uniforms:{u_res:{value:new THREE.Vector2(w,h)},u_t:{value:0.}},
    vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:AM_FS,
    depthWrite:false,depthTest:false
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat));
  _amResizeFn=function(){
    if(!document.getElementById('am-webgl-canvas')){stopAmThreeJS();return;}
    var c2=document.getElementById('am-webgl-canvas');
    var nw=c2.offsetWidth||window.innerWidth,nh=c2.offsetHeight||window.innerHeight;
    renderer.setSize(nw,nh);
    mat.uniforms.u_res.value.set(nw,nh);
  };
  window.addEventListener('resize',_amResizeFn);
  var t=0;
  function animate(){
    if(!document.getElementById('am-webgl-canvas')){stopAmThreeJS();return;}
    _amRaf=requestAnimationFrame(animate);
    t+=.006;
    mat.uniforms.u_t.value=t;
    renderer.clear();
    renderer.render(scene,cam);
  }
  animate();
}

// ── SWITCH ENTITY PAGE ──
let _seRaf=null,_seRenderer=null,_seResizeFn=null;
function stopSeThreeJS(){
  if(_seRaf){cancelAnimationFrame(_seRaf);_seRaf=null;}
  if(_seResizeFn){window.removeEventListener('resize',_seResizeFn);_seResizeFn=null;}
  if(_seRenderer){try{_seRenderer.dispose();}catch(e){}; _seRenderer=null;}
}
function initSeThreeJS(){
  if(!document.getElementById('se-webgl-canvas'))return;
  if(window.THREE){_startSeThreeJS();return;}
  const s=document.createElement('script');
  s.src='https://unpkg.com/three@0.134.0/build/three.min.js';
  s.onload=function(){if(document.getElementById('se-webgl-canvas'))_startSeThreeJS();};
  s.onerror=function(){console.warn('Three.js CDN unavailable');};
  document.head.appendChild(s);
}
function _startSeThreeJS(){
  const canvas=document.getElementById('se-webgl-canvas');
  if(!canvas||!window.THREE)return;
  stopSeThreeJS();
  const w=window.innerWidth,h=window.innerHeight;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setSize(w,h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.autoClear=false;
  _seRenderer=renderer;
  // Background — orthographic full-screen plasma shader (ported from liquid-logo)
  const bgScene=new THREE.Scene();
  const bgCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const PLASMA_FS=`
uniform vec2 u_res;
uniform float u_t;
float rng(vec2 s){return fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453);}
vec3 m3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 m4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return m4(((x*34.)+1.)*x);}
vec4 tinv(vec4 r){return 1.7928429-0.8537347*r;}
float sn(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=m3(i);
  vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n=.142857;vec3 ns=n*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 xs=x_*ns.x+ns.yyyy;vec4 ys=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(xs)-abs(ys);
  vec4 b0=vec4(xs.xy,ys.xy);vec4 b1=vec4(xs.zw,ys.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 nr=tinv(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=nr.x;p1*=nr.y;p2*=nr.z;p3*=nr.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
void main(){
  vec2 r=u_res;vec2 FC=gl_FragCoord.xy;
  vec2 p=(FC*2.-r)/r.y;vec2 lv=vec2(0.);
  lv.x+=abs(.5-dot(p,p))*.4;
  vec2 v=p*(1.-lv.x)/2.2;
  v+=vec2(sn(vec3(p*1.8,u_t*.12))*.5,sn(vec3(p*1.8+10.,u_t*.12))*.35);
  vec4 o=vec4(0.);
  for(float i=0.;i<12.;i++){
    float idx=i+1.;
    v+=cos(v.yx*idx+vec2(0.,idx)+u_t)/idx+3.5;
    o+=(sin(vec4(v.x,v.y,v.y,v.x))+1.)*abs(v.x-v.y)*.11;
  }
  o=o.wxyz*.9+o*.1;
  vec4 ep=exp(p.y*vec4(-.4,-.7,.2,0.));
  float el=exp(-1.4*lv.x);
  vec4 rt=ep*el/max(o,vec4(.001));
  vec4 e2=exp(clamp(2.*rt,-15.,15.));
  o=(e2-1.)/(e2+1.);
  float gn=rng(FC/1.5+u_t*.0004)*.05-.025;
  o=clamp(o+gn,0.,1.);
  vec3 c=o.rgb*.38;
  c=mix(c,vec3(c.b*.3,c.g*.2,c.b*.9),.55);
  c+=vec3(.015,.008,.045);
  gl_FragColor=vec4(c,1.);
}`;
  const bgMat=new THREE.ShaderMaterial({
    uniforms:{u_res:{value:new THREE.Vector2(w,h)},u_t:{value:0.}},
    vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:PLASMA_FS,
    depthWrite:false,depthTest:false
  });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),bgMat));
  // Foreground — perspective scene with floating wireframe geometric patterns
  const fgScene=new THREE.Scene();
  const fgCam=new THREE.PerspectiveCamera(60,w/h,0.1,100);
  fgCam.position.z=5;
  const objs=[];
  // EdgesGeometry + LineSegments → clean architectural wireframe aesthetic
  const cfgs=[
    {geo:new THREE.IcosahedronGeometry(.75,1),x:-3.2,y:2,z:-.5,c:0xe0e7ff,op:.45,sp:.006},
    {geo:new THREE.TorusKnotGeometry(.55,.17,80,8),x:3.1,y:1.6,z:-.3,c:0xa5b4fc,op:.55,sp:.009},
    {geo:new THREE.IcosahedronGeometry(.5,0),x:-2,y:-2.2,z:.2,c:0xffffff,op:.32,sp:.005},
    {geo:new THREE.TorusGeometry(.52,.17,20,64),x:2.6,y:-1.6,z:-.3,c:0xc7d2fe,op:.42,sp:.008},
    {geo:new THREE.OctahedronGeometry(.6),x:.4,y:2.8,z:-.8,c:0xffffff,op:.38,sp:.007},
  ];
  cfgs.forEach(function(cfg){
    var edges=new THREE.EdgesGeometry(cfg.geo);
    var mat=new THREE.LineBasicMaterial({color:cfg.c,transparent:true,opacity:cfg.op});
    var mesh=new THREE.LineSegments(edges,mat);
    mesh.position.set(cfg.x,cfg.y,cfg.z);
    mesh.userData={sp:cfg.sp,iy:cfg.y};
    fgScene.add(mesh);objs.push(mesh);
  });
  _seResizeFn=function(){
    if(!document.getElementById('se-webgl-canvas')){stopSeThreeJS();return;}
    var nw=window.innerWidth,nh=window.innerHeight;
    fgCam.aspect=nw/nh;fgCam.updateProjectionMatrix();
    renderer.setSize(nw,nh);
    bgMat.uniforms.u_res.value.set(nw,nh);
  };
  window.addEventListener('resize',_seResizeFn);
  var t=0;
  function animate(){
    if(!document.getElementById('se-webgl-canvas')){stopSeThreeJS();return;}
    _seRaf=requestAnimationFrame(animate);
    t+=.012;
    bgMat.uniforms.u_t.value=t;
    objs.forEach(function(obj,i){
      obj.rotation.x+=obj.userData.sp;
      obj.rotation.y+=obj.userData.sp*1.4;
      obj.position.y=obj.userData.iy+Math.sin(t*.45+i*1.1)*.35;
    });
    renderer.clear();
    renderer.render(bgScene,bgCam);
    renderer.clearDepth();
    renderer.render(fgScene,fgCam);
  }
  animate();
}
/* A choice on the Switch Entity page is applied on Proceed, and only to an
   entity the signed-in account holds a role in. */
let seChosen='';
function seChoices(){
  const mine=typeof idEntitiesOf==='function'?idEntitiesOf(idMe()):entitiesData.map(e=>e.entityId);
  return entitiesData.filter(e=>mine.indexOf(e.entityId)>=0);
}
function selectSwitchEntity(id){
  seChosen=id;
  document.querySelectorAll('.se-entity-card').forEach(c=>c.classList.toggle('selected',c.dataset.id===id));
}
function proceedSwitchEntity(){
  const e=seChoices().find(x=>x.id===(seChosen||seSelectedEntity));
  if(!e)return;
  seSelectedEntity=e.id;seChosen='';
  if(typeof appEntityChanged==='function')appEntityChanged();
  navigatePage('dashboard');
  showToast('Switched to '+e.name,'info','Records, settings and roles are this entity\'s now.');
}
function toggleSeDropdown(){
  const panel=document.getElementById('se-dd-panel');
  if(panel)panel.classList.toggle('open');
}
function pickSeEntity(id){
  seChosen=id;
  const e=entitiesData.find(x=>x.id===id);
  const trigger=document.getElementById('se-dd-trigger');
  if(trigger&&e){
    trigger.innerHTML='<div class="se-dd-sel-initials" style="background:'+
      (e.active?'var(--orange)':'#64748b')+'">'+e.initials+'</div>'+
      '<span class="se-dd-sel-name">'+e.name+'</span>'+
      '<svg class="se-dd-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
  }
  const panel=document.getElementById('se-dd-panel');
  if(panel)panel.classList.remove('open');
}
function buildSwitchEntityHTML(){
  const chevIco='<svg class="se-dd-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
  const checkIco='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  const switchIco='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
  const choices=seChoices();
  const sel=choices.find(e=>e.id===(seChosen||seSelectedEntity))||choices[0]||entitiesData[0];
  const triggerHTML='<div class="se-dd-sel-initials" style="background:'+(sel.active?'var(--orange)':'#64748b')+'">'+sel.initials+'</div><span class="se-dd-sel-name">'+sel.name+'</span>'+chevIco;
  const optionItems=choices.map(e=>`
    <div class="se-dd-option${sel.id===e.id?' active':''}" onclick="pickSeEntity('${e.id}')">
      <div class="se-dd-opt-initials" style="background:${e.active?'var(--orange)':'#64748b'}">${e.initials}</div>
      <div class="se-dd-opt-info">
        <div class="se-dd-opt-name">${e.name} ${e.id===seSelectedEntity?'<span class="se-dd-curr">Current</span>':''}</div>
        <div class="se-dd-opt-sub">${e.entityId} &nbsp;·&nbsp; ${e.type}</div>
      </div>
      ${sel.id===e.id?'<div class="se-dd-check">'+checkIco+'</div>':''}
    </div>`).join('');
  return `<div class="se-page">
    <div class="se-min-bg"></div>
    <div class="se-center se-min-card">
      <div class="se-icon-wrap">${switchIco}</div>
      <h2 class="se-title">Switch Entity</h2>
      <p class="se-subtitle">Financial transactions will be filtered as per the selected entity.</p>
      <div class="se-dd-wrap">
        <div class="se-dd-trigger" id="se-dd-trigger" onclick="toggleSeDropdown()">${triggerHTML}</div>
        <div class="se-dd-panel" id="se-dd-panel">${optionItems}</div>
      </div>
      <div class="se-btns">
        <button class="se-cancel" onclick="navigatePage('dashboard')">Cancel</button>
        <button class="se-proceed" onclick="proceedSwitchEntity()">Proceed</button>
      </div>
    </div>
  </div>`;
}

// ── MY PROFILE PAGE ──
/* A tab click changes a SECTION, not the page. Only .prof-tab-body is
   rewritten: the hero card keeps its place, the tab bar keeps its DOM (so the
   underline marker travels rather than being rebuilt beneath itself), and the
   scroll position is left where the user put it. */
function setProfTab(tab){
  if(profTab===tab)return;
  profTab=tab;
  const body=profTabBody();
  if(!body){refreshProfile();return;}
  document.querySelectorAll("#adt-content .prof-tab").forEach(function(b){
    b.classList.toggle("active",b.dataset.tab===tab);
  });
  profPaintTabBody(body);
}
function profTabBody(){return document.querySelector("#adt-content .prof-tab-body");}
/* Replay the enter animation on the new body. The class has to come off and
   the layout be read before it goes back on, or the second click re-adds a
   class that is already there and nothing animates. */
function profPaintTabBody(body){
  body.innerHTML=buildProfTabContent();
  body.classList.remove("prof-tab-in");
  void body.offsetWidth;
  body.classList.add("prof-tab-in");
}
// ── PROFILE ATTACHMENTS ──
// The six every employee must have on file - the same set the dashboard's
// Upload required documents popup asks for. They lead the list, and carry a
// Mandatory tag while they are still to be uploaded; the rest are optional.
const PROF_DOCS_MANDATORY=['PAN Card','Aadhaar Card Front','Aadhaar Card Back','Passport Photograph','Cancelled Cheque / Bank Passbook','Educational Certificates'];
const PROF_DOCS=PROF_DOCS_MANDATORY.concat(['Resume','Signed Offer Letter','Relieving Letter','Address Proof','Salary Slip1','Salary Slip2','Salary Slip3','Salary Slip4','Salary Slip5','Salary Slip6','Last Offer Letter']);
function profDocTag(d){return PROF_DOCS_MANDATORY.indexOf(d)>=0?'<span class="prof-att-req">Mandatory</span>':'';}
/* Uploading or removing an attachment only ever changes what is inside the
   tab, so it repaints the tab body alone. The full page build is the fallback
   for the first paint, when there is no body to write into yet. */
function refreshProfile(){
  const body=profTabBody();
  if(body){profPaintTabBody(body);return;}
  const el=document.getElementById("adt-content");
  if(el)el.innerHTML=buildMyProfileHTML();
}
function profFormatSize(bytes){
  if(bytes<1024)return bytes+' B';
  if(bytes<1024*1024)return (bytes/1024).toFixed(1)+' KB';
  return (bytes/(1024*1024)).toFixed(1)+' MB';
}
// Opens a real file picker for the given document slot.
function profPickFile(docName){
  const inp=document.createElement('input');
  inp.type='file';
  inp.accept='.pdf,.png,.jpg,.jpeg,.doc,.docx';
  inp.style.display='none';
  inp.onchange=function(){
    const f=inp.files&&inp.files[0];
    if(f)profReceiveFile(docName,f);
    inp.remove();
  };
  document.body.appendChild(inp);
  inp.click();
}
function profReceiveFile(docName,file){
  const MAX=5*1024*1024;
  if(file.size>MAX){showToast('File too large','error',profFormatSize(file.size)+' exceeds the 5 MB limit.');return;}
  if(file.size===0){showToast('File is empty','error','Please choose a valid document.');return;}
  profAttachMap()[docName]={
    file:file.name,
    size:profFormatSize(file.size),
    date:new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
  };
  refreshProfile();
  showToast(docName+' uploaded','success',file.name+' &middot; '+profFormatSize(file.size));
}
function profRemoveAttachment(docName){
  if(!profAttachMap()[docName])return;
  delete profAttachMap()[docName];
  refreshProfile();
  showToast(docName+' removed','info','The document is back in the pending list.');
}
function profDownloadAttachment(docName){
  const a=profAttachMap()[docName];
  if(!a)return;
  showToast('Preparing download…','info',a.file);
  setTimeout(function(){showToast('Downloaded','success',a.file);},900);
}
// Drag & drop straight onto a pending row.
function profDragOver(e,el){e.preventDefault();e.stopPropagation();el.classList.add('prof-att-dragging');}
function profDragLeave(e,el){e.preventDefault();e.stopPropagation();el.classList.remove('prof-att-dragging');}
function profDrop(e,el,docName){
  e.preventDefault();e.stopPropagation();
  el.classList.remove('prof-att-dragging');
  const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
  if(f)profReceiveFile(docName,f);
}

/* DT-716: the profile of someone without a Direct or Global employee record - their own account, nothing else. */
function profAccountInfo(){
  const uid=typeof idMe==='function'?idMe():'',u=uid&&typeof idUser==='function'?idUser(uid):null;
  if(!u)return {uid:'',name:CURRENT_USER||'Not signed in',email:'',kind:'',roles:[],entity:'',code:''};
  const rec=typeof idEmpOfUser==='function'?idEmpOfUser(uid):null;
  return {uid:uid,name:idName(uid),email:u.email||'',kind:rec?'Admin Access':(u.kind||'Client user'),
    roles:typeof emsRolesHeld==='function'?emsRolesHeld():[],entity:typeof idEntityName==='function'?idEntityName(idEntity()):'',code:rec&&rec.empId?String(rec.empId):''};
}
function profAccountHeroHTML(a,iCheck){
  return `<div class="prof-hero-card">
      <div class="prof-avatar-wrap"><div class="prof-avatar">${sbEsc(empInitials(a.name))}</div><div class="prof-avatar-badge">${iCheck}</div></div>
      <div class="prof-hero-info">
        <div class="prof-hero-name">${sbEsc(a.name)}</div>
        <div class="prof-hero-role"><span class="prof-role-badge">${sbEsc(a.roles[0]||'User')}</span><span class="prof-hero-entity">${sbEsc(a.entity)}</span></div>
        <div class="prof-hero-meta">${sbEsc(a.email)}${a.code?' &nbsp;·&nbsp; '+sbEsc(a.code):''} &nbsp;·&nbsp; ${sbEsc(a.kind)}</div>
      </div>
    </div>`;
}
function profAccountBasicHTML(a,fc,iUser,iMail,iShield,iGlobe,iHash){
  return `<div class="ep-form-card"><div class="prof-section-hdr"><span class="policy-section-title">Account Information</span></div>
      <div class="prof-field-grid">${fc(iUser,'Full Name',sbEsc(a.name))}${fc(iMail,'Email Address',sbEsc(a.email||'—'))}
        ${fc(iShield,'Roles in this entity',sbEsc(a.roles.join(', ')||'—'))}${fc(iGlobe,'Entity',sbEsc(a.entity||'—'))}${fc(iHash,'Account type',sbEsc(a.kind))}</div>
      <p class="wb-muted" style="margin-top:12px">${sbEsc(a.name)} has no Direct or Global employee record in this entity, so there are no employment, bank, payslip or leave details to show.</p></div>`;
}
function profAccountEmptyHTML(a,tab){
  const what={'bank-details':'bank details','attachments':'employee documents','salary-slip':'salary slips','leaves-holidays':'leave records'}[tab]||'details';
  return `<div class="ep-form-card"><div class="wb-empty"><b>No ${what}</b><span>${sbEsc(a.name)} has no Direct or Global employee record in this entity, so there are no ${what} here.</span></div></div>`;
}
function buildMyProfileHTML(){
  const iCheck='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  const iEdit='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

  const profTabs=[
    {id:'basic-details',label:'Basic Details'},
    {id:'bank-details',label:'Bank Details'},
    {id:'attachments',label:'Attachments'},
    {id:'salary-slip',label:'Salary Slip'},
    {id:'leaves-holidays',label:'Leaves'},
    {id:'my-benefits',label:'Wallet & Benefits'},
    {id:'change-password',label:'Change Password'},
  ].filter(t=>t.id!=='my-benefits'||typeof mcOn!=='function'||mcOn('expenses'))   // My Benefits goes with the Expenses module
   .filter(t=>t.id!=='salary-slip'||typeof mcOn!=='function'||mcOn('salary'))
   .filter(t=>t.id!=='leaves-holidays'||typeof mcOn!=='function'||mcOn('timesheets'));
  /* ONC Card, on the employee's own profile while the company's card programme applies to them (FR-EMS-EMP-01). */
  {const pe0=typeof empProfPerson==='function'?empProfPerson():null;
   if(pe0&&typeof deExtraTabs==='function'&&deExtraTabs(pe0).some(t=>t.id==='onc-card')){const at=profTabs.findIndex(t=>t.id==='change-password');profTabs.splice(at<0?profTabs.length:at,0,{id:'onc-card',label:'ONC Card'});}
   if(profTab==='onc-card'&&!profTabs.some(t=>t.id==='onc-card'))profTab='basic-details';}
  const tabBar=`<div class="prof-tab-bar">${profTabs.map(t=>`<button class="prof-tab${profTab===t.id?' active':''}" data-tab="${t.id}" onclick="setProfTab('${t.id}')">${t.label}</button>`).join('')}</div>`;

  /* An employee arriving from their dashboard (Upload Documents) sees their
     own profile; everyone else sees the signed-in admin's. */
  const pe=typeof empProfPerson==='function'?empProfPerson():null;
  /* DT-716: with no employee record (or a record that is not Pallavi's own), the account's own details. */
  const acct=!pe&&typeof empProfIsDesignOwner==='function'&&!empProfIsDesignOwner()?profAccountInfo():null;
  if(acct)return `<div class="ep-page prof-page">${profAccountHeroHTML(acct,iCheck)}${tabBar}<div class="prof-tab-body">${buildProfTabContent()}</div></div>`;
  const heroCard=`
    <div class="prof-hero-card">
      <div class="prof-avatar-wrap">
        <div class="prof-avatar">${pe?empInitials(pe.name):'PP'}</div>
        <div class="prof-avatar-badge">${iCheck}</div>
      </div>
      <div class="prof-hero-info">
        <div class="prof-hero-name">${pe?sbEsc(pe.name):'Pallavi Parate'}</div>
        <div class="prof-hero-role"><span class="prof-role-badge">${pe?'Employee':'Admin'}</span><span class="prof-hero-entity"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> ${sbEsc(pe&&typeof idEntityName==='function'?idEntityName(pe.entityId):'Dhi Hyperlocal')}</span></div>
        <div class="prof-hero-meta">${pe?sbEsc(pe.empId)+' &nbsp;·&nbsp; '+sbEsc(pe.jobTitle||'')+' &nbsp;·&nbsp; Employee Status: '+sbEsc(pe.status):'Last login: Today, 9:41 AM &nbsp;·&nbsp; Member since Jan 2024'}</div>
      </div>
      ${pe&&typeof epCanSelf==='function'&&epCanSelf(pe)&&!epSelfEditing?`<button class="ep-save-btn prof-edit-btn" onclick="empProfEditStart()">${iEdit} Edit Profile</button>`:''}
    </div>`;

  return `<div class="ep-page prof-page">${heroCard}${tabBar}<div class="prof-tab-body">${buildProfTabContent()}</div></div>`;
}

/* The body of the selected tab, and nothing around it. Kept separate from
   buildMyProfileHTML so setProfTab() can swap ONLY .prof-tab-body: the hero
   card and the tab bar stay in the DOM, which is what lets the underline
   marker travel between tabs instead of being rebuilt under it. */
function buildProfTabContent(){
  const iUser='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iMail='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  const iPhone='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.2.73.43 1.44.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.9-.87a2 2 0 0 1 2.11-.45c1.37.27 2.08.5 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  const iShield='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  const iGlobe='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const iCal='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iLock='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  const iKey='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>';
  const iBell='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  const iCheck='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  const iPaperclip='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';
  const iUpload='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  const iBank='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
  const iHash='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>';
  const iDl='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

  const fc=(ico,label,val)=>`<div class="prof-field"><div class="prof-field-icon">${ico}</div><div class="prof-field-body"><div class="prof-field-label">${label}</div><div class="prof-field-val">${val}</div></div></div>`;

  let tabContent='';
  const pe=typeof empProfPerson==='function'?empProfPerson():null;
  const acct=!pe&&typeof empProfIsDesignOwner==='function'&&!empProfIsDesignOwner()?profAccountInfo():null;
  if(acct&&['basic-details','bank-details','attachments','salary-slip','leaves-holidays'].indexOf(profTab)>=0)
    return profTab==='basic-details'?profAccountBasicHTML(acct,fc,iUser,iMail,iShield,iGlobe,iHash):profAccountEmptyHTML(acct,profTab);

  if(profTab==='onc-card'&&pe&&typeof oncTabHTML==='function')
    return '<div class="prof-body"><div class="prof-left ep-onc"><div class="ep-form-card">'+oncTabHTML(pe)+'</div></div></div>';
  if(profTab==='basic-details'&&pe&&typeof epSelfEditing!=='undefined'&&epSelfEditing&&epIsSelf(pe))return epSelfEditHTML(pe);
  if(profTab==='basic-details'&&pe){
    const v=x=>x&&x!=='--'?sbEsc(x):'<span style="color:#9ca3af">—</span>';
    const recent=empLogs(pe).slice(0,5);
    const own=typeof epSelfViewHTML==='function'?epSelfViewHTML(pe,fc,{user:iUser,mail:iMail,phone:iPhone,shield:iShield,globe:iGlobe,cal:iCal}):'';
    tabContent=`<div class="prof-body">
      <div class="prof-left">${own}${own?'':`
        <div class="ep-form-card">
          <div class="prof-section-hdr"><span class="policy-section-title">Personal Information</span></div>
          <div class="prof-field-grid">
            ${fc(iUser,'Full Name',v(pe.name))}
            ${fc(iMail,'Email Address',v(pe.email))}
            ${fc(iPhone,'Phone Number',v(pe.contact))}
            ${fc(iGlobe,'Country',v(pe.country||'India'))}
          </div>
        </div>
        <div class="ep-form-card">
          <div class="prof-section-hdr"><span class="policy-section-title">Work Details</span></div>
          <div class="prof-field-grid">
            ${fc(iShield,'Job Title',v(pe.jobTitle))}
            ${fc(iUser,'Department',v(pe.dept))}
            ${fc(iGlobe,'Entity','Dhi Hyperlocal')}
            ${fc(iCal,'Joining Date',v(pe.joinDate))}
            ${fc(iUser,'Employee ID',v(pe.empId))}
            ${fc(iShield,'Employee Status',empLifeBadge(pe.status))}
          </div>
        </div>
      `}</div>
      <div class="prof-right">
        <div class="ep-form-card">
          <div class="prof-section-hdr"><span class="policy-section-title">Recent Activity</span></div>
          <div class="prof-activity-list">
            ${recent.map((a,i)=>`<div class="prof-activity-row"><div class="prof-activity-dot${i===0?' active':''}"></div><div class="prof-activity-body"><div class="prof-activity-action">${sbEsc(a.type==='profile'?'Profile updated':a.status)}</div><div class="prof-activity-time">${a.date}, ${a.time}</div></div></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  else if(profTab==='basic-details'){
    const activities=[
      {action:'Logged in',time:'Today, 9:41 AM'},
      {action:'Updated leave policy — Casual Leave',time:'Yesterday, 3:15 PM'},
      {action:'Added contract for Antar Malhotra',time:'Jun 24, 11:02 AM'},
      {action:'Approved payroll for Jun 2026',time:'Jun 22, 9:00 AM'},
      {action:'Created new team — Engineering',time:'Jun 20, 2:30 PM'},
    ];
    const notifRows=[
      {label:'Contract updates',desc:'Notify when a contract status changes',on:true},
      {label:'Payroll processed',desc:'Notify when payroll run is completed',on:true},
      {label:'Leave requests',desc:'Notify on new leave approvals or rejections',on:false},
      {label:'System alerts',desc:'Critical platform and security alerts',on:true},
    ];
    const toggle=(on)=>`<div class="prof-toggle${on?' on':''}"></div>`;
    tabContent=`<div class="prof-body prof-body--rows">
      <!-- Paired rows, not two free columns: each left card shares a row
           with the right card beside it, so their tops and bottoms line up. -->
        <div class="ep-form-card">
          <div class="prof-section-hdr"><span class="policy-section-title">Personal Information</span></div>
          <div class="prof-field-grid">
            ${fc(iUser,'Full Name','Pallavi Parate')}
            ${fc(iMail,'Email Address','pallavi@dhihyperlocal.com')}
            ${fc(iPhone,'Phone Number','+91 98765 43210')}
            ${fc(iGlobe,'Country','India')}
            ${fc(iCal,'Date of Birth','15 Mar 1990')}
            ${fc(iUser,'Gender','Female')}
          </div>
        </div>
        <div class="ep-form-card prof-stats-card">
          <div class="prof-section-hdr"><span class="policy-section-title">Activity Overview</span></div>
          <div class="prof-stats-grid">
            <div class="prof-stat"><div class="prof-stat-num" style="color:var(--orange)">24</div><div class="prof-stat-lbl">Contracts Managed</div></div>
            <div class="prof-stat"><div class="prof-stat-num" style="color:#16a34a">8</div><div class="prof-stat-lbl">Policies Configured</div></div>
            <div class="prof-stat"><div class="prof-stat-num" style="color:#2563eb">142</div><div class="prof-stat-lbl">Actions This Month</div></div>
            <div class="prof-stat"><div class="prof-stat-num" style="color:#7c3aed">3</div><div class="prof-stat-lbl">Teams Managed</div></div>
          </div>
        </div>
        <div class="ep-form-card">
          <div class="prof-section-hdr"><span class="policy-section-title">Work Details</span></div>
          <div class="prof-field-grid">
            ${fc(iShield,'Role','Admin')}
            ${fc(iUser,'Department','Human Resources')}
            ${fc(iGlobe,'Entity','Dhi Hyperlocal')}
            ${fc(iCal,'Joined','01 Jan 2024')}
            ${fc(iUser,'Employee ID','EMP-00211')}
            ${fc(iUser,'Reports To','Rahul Mehta')}
          </div>
        </div>
        <div class="ep-form-card">
          <div class="prof-section-hdr"><span class="policy-section-title">Notification Preferences</span>${iBell}</div>
          <div class="prof-notif-list">
            ${notifRows.map(n=>`<div class="prof-notif-row"><div><div class="prof-notif-label">${n.label}</div><div class="prof-notif-desc">${n.desc}</div></div>${toggle(n.on)}</div>`).join('')}
          </div>
        </div>
        <div class="ep-form-card">
          <div class="prof-section-hdr"><span class="policy-section-title">Security</span></div>
          <div class="prof-field-grid">
            ${fc(iLock,'Password','••••••••••  <span style="font-size:11px;color:var(--orange);cursor:pointer;font-weight:600;margin-left:6px">Change</span>')}
            ${fc(iKey,'Two-Factor Auth','<span style="color:#16a34a;font-weight:600;font-size:12px">Enabled</span>')}
            ${fc(iCal,'Last Password Change','15 May 2026')}
            ${fc(iShield,'Active Sessions','<span style="font-size:12px">1 device &nbsp;<span style="color:var(--orange);cursor:pointer;font-weight:600">Manage</span></span>')}
          </div>
        </div>
        <div class="ep-form-card">
          <div class="prof-section-hdr"><span class="policy-section-title">Recent Activity</span></div>
          <div class="prof-activity-list">
            ${activities.map((a,i)=>`<div class="prof-activity-row"><div class="prof-activity-dot${i===0?' active':''}"></div><div class="prof-activity-body"><div class="prof-activity-action">${a.action}</div><div class="prof-activity-time">${a.time}</div></div></div>`).join('')}
          </div>
        </div>
    </div>`;
  }

  else if(profTab==='bank-details'&&pe){
    /* DT-716: another employee never sees the design owner's bank account. ADT holds no bank details for them yet. */
    tabContent=`<div class="ep-form-card"><div class="wb-empty"><b>No bank details on file</b><span>Bank details for ${sbEsc(pe.name)} are not recorded in ADT.</span></div></div>`;
  }
  else if(profTab==='bank-details'){
    tabContent=`<div class="ep-form-card">
      <div class="prof-section-hdr"><span class="policy-section-title">Bank Account Details</span></div>
      <div class="prof-field-grid prof-field-grid-wide">
        ${fc(iGlobe,'Country / Location','India')}
        ${fc(iUser,'Account Holder Name','Pallavi Parate')}
        ${fc(iBank,'Bank Name','ICICI Bank')}
        ${fc(iHash,'Account Number','3456 7890 1234')}
        ${fc(iKey,'IFSC Code','ICIC0001234')}
        ${fc(iShield,'Swift Code','ICICINBB')}
        ${fc(iGlobe,'Currency','INR')}
        ${fc(iMail,'Linked Email','pallavi@dhihyperlocal.com')}
      </div>
    </div>`;
  }

  else if(profTab==='attachments'){
    const iTrash='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    const uploadedDocs=PROF_DOCS.filter(d=>profAttachMap()[d]).map(d=>Object.assign({name:d},profAttachMap()[d]));
    const pendingDocs=PROF_DOCS.filter(d=>!profAttachMap()[d]);
    const total=PROF_DOCS.length;
    const mandPending=pendingDocs.filter(d=>PROF_DOCS_MANDATORY.indexOf(d)>=0).length;
    const esc=s=>String(s).replace(/'/g,"\\'");
    const tick='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>';
    const uploadedItems=uploadedDocs.map(d=>`
      <div class="prof-att-card">
        <span class="prof-att-iconwrap">${iPaperclip}<span class="prof-att-tick">${tick}</span></span>
        <span class="prof-att-body">
          <span class="prof-att-name">${d.name}</span>
          <span class="prof-att-meta">${d.file}${d.size?' &middot; '+d.size:''}</span>
          <span class="prof-att-date">Uploaded ${d.date}</span>
        </span>
        <button class="prof-att-dl" title="Download" onclick="profDownloadAttachment('${sbEsc(d.name)}')">${iDl}</button>
        <button class="prof-att-dl danger" title="Remove" onclick="profRemoveAttachment('${sbEsc(d.name)}')">${iTrash}</button>
      </div>`).join('');
    /* Same card as an uploaded document, drawn as the empty slot it is: a dashed
       outline, the name, what it still needs. The whole card is the target -
       click it or drop a file on it - and Upload says so in words. */
    const pendingItems=pendingDocs.map(d=>`
      <div class="prof-att-card is-pending" role="button" tabindex="0" title="Upload ${sbEsc(d)}"
        onclick="profPickFile('${sbEsc(d)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();profPickFile('${sbEsc(d)}');}"
        ondragover="profDragOver(event,this)" ondragleave="profDragLeave(event,this)" ondrop="profDrop(event,this,'${sbEsc(d)}')">
        <span class="prof-att-iconwrap">${iPaperclip}</span>
        <span class="prof-att-body">
          <span class="prof-att-name prof-att-name-row"><span class="prof-att-name-txt">${d}</span>${profDocTag(d)}</span>
          <span class="prof-att-meta">PDF, JPG, PNG or DOC</span>
        </span>
        <button class="prof-att-up-btn" tabindex="-1" onclick="event.stopPropagation();profPickFile('${sbEsc(d)}')">${iUpload} Upload</button>
      </div>`).join('');
    const uploadedCard=uploadedDocs.length?`<div class="ep-form-card" style="margin-bottom:16px">
      <div class="prof-section-hdr"><span class="policy-section-title">Uploaded</span><span class="prof-att-count ok">${tick} ${uploadedDocs.length} of ${total} uploaded</span></div>
      <div class="prof-att-cards">${uploadedItems}</div>
    </div>`:'';
    const pendingCard=pendingDocs.length?`<div class="ep-form-card">
      <div class="prof-section-hdr"><span class="policy-section-title">Not Uploaded</span><span class="prof-att-count is-wait">${pendingDocs.length} pending${mandPending?' · '+mandPending+' mandatory':''}</span></div>
      <p class="prof-att-hint">Click a document or drop a file on it to upload.</p>
      <div class="prof-att-cards">${pendingItems}</div>
    </div>`:`<div class="ep-form-card"><div class="prof-att-empty">${tick} All ${total} documents have been uploaded.</div></div>`;
    /* Requested Docs first - it is what HR is waiting on. It renders nothing
       when nothing has been requested, so the section stays hidden. */
    tabContent=(typeof empProfReqDocsHTML==='function'?empProfReqDocsHTML():'')+uploadedCard+pendingCard;
  }

  else if(profTab==='salary-slip'){
    const months=['June 2026','May 2026','April 2026','March 2026','February 2026','January 2026','December 2025','November 2025','October 2025','September 2025','August 2025','July 2025'];
    const rows=months.map((m,i)=>`<tr>
      <td class="csag-td csag-num">${i+1}</td>
      <td class="csag-td"><div class="lp-c-main">${m}</div></td>
      <td class="csag-td">${pe?sbEsc(pe.name):'Pallavi Parate'}</td>
      <td class="csag-td">${pe?sbEsc(pe.empId||''):'EMP-00211'}</td>
      <td class="csag-td"><span class="lp-status-badge tone-ok">Generated</span></td>
      <td class="csag-td csag-act"><button class="att-row-btn" title="Download ${m}">${iDl}</button></td>
    </tr>`).join('');
    tabContent=`<div class="ep-form-card">
      <div class="prof-section-hdr"><span class="policy-section-title">Salary Slips</span></div>
      <div class="att-bar"><span class="att-count">${months.length} slips</span></div>
      <div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table">
        <thead><tr>
          <th>Sr. No</th><th>Month</th><th>Employee</th><th>Employee ID</th><th>Status</th><th class="csag-act">Action</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
  }

  /* The signed-in person's own balance and the entity's holidays. The admin
     is "Pallavi P" in leave data; lhResolve() matches the two spellings. */
  else if(profTab==='leaves-holidays'){
    tabContent='<div class="ep-form-card">'+lhPanelHTML('prof',pe?pe.name:'Pallavi Parate')+'</div>';
  }

  /* Planned flexi benefits (js/wallet-benefits.js). Never a wallet balance. */
  else if(profTab==='my-benefits'&&(typeof mcOn!=='function'||mcOn('expenses'))){
    /* My Benefits is the acting person's own (js/ems-access.js), never a profile persona's. */
    tabContent=typeof wbMyBenefitsHTML==='function'?wbMyBenefitsHTML(typeof emsActorRecord==='function'?emsActorRecord():null,true):'';
  }

  else if(profTab==='change-password'){
    /* Form on the left, the rules on the right. The rules are a checklist
       that ticks itself off as the new password is typed, rather than one
       sentence to read and remember - see cpCheck(). */
    const inp=(id,label,ph,extra)=>`<div class="ep-form-group">
        <label class="ep-form-label" for="${id}">${label} <span class="req">*</span></label>
        <div class="cp-input-wrap">
          <input class="ep-form-input" id="${id}" type="password" placeholder="${ph}" autocomplete="${id==='cp-current'?'current-password':'new-password'}" oninput="cpCheck()">
          <button type="button" class="cp-eye" title="Show password" aria-label="Show password" onclick="cpEye('${id}',this)">${CP_EYE}</button>
        </div>${extra||''}
      </div>`;
    const rule=(k,l)=>`<li class="cp-rule" data-cp="${k}"><span class="cp-rule-dot">${iCheck}</span>${l}</li>`;
    tabContent=`<div class="ep-form-card cp-card">
      <div class="prof-section-hdr"><span class="policy-section-title">Change Password</span></div>
      <p class="cp-sub">Choose a strong password you don&rsquo;t use anywhere else. You&rsquo;ll stay signed in on this device.</p>
      <div class="cp-layout">
        <div class="cp-form">
          ${inp('cp-current','Current Password','Enter current password')}
          ${inp('cp-new','New Password','Enter new password',
            `<div class="cp-meter" id="cp-meter"><div class="cp-meter-bar"><span></span><span></span><span></span><span></span></div><span class="cp-meter-lbl" id="cp-meter-lbl">Enter a password</span></div>`)}
          ${inp('cp-confirm','Confirm New Password','Re-enter new password',
            `<div class="cp-match" id="cp-match"></div>`)}
        </div>
        <aside class="cp-rules">
          <div class="cp-rules-title">Password requirements</div>
          <ul>
            ${rule('len','At least 8 characters')}
            ${rule('up','One uppercase letter')}
            ${rule('low','One lowercase letter')}
            ${rule('num','One number')}
            ${rule('sym','One special character')}
            ${rule('diff','Different from current password')}
          </ul>
        </aside>
      </div>
      <div class="cp-foot">
        <button class="ep-cancel-btn" onclick="cpReset()">Cancel</button>
        <button class="ep-save-btn" onclick="cpSubmit()">Update Password</button>
      </div>
    </div>`;
  }

  return tabContent;
}

/* ── Change Password tab ── */
const CP_EYE='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const CP_EYE_OFF='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
function cpVal(id){const el=document.getElementById(id);return el?el.value:'';}
function cpEye(id,btn){
  const el=document.getElementById(id);if(!el)return;
  const show=el.type==='password';
  el.type=show?'text':'password';
  btn.innerHTML=show?CP_EYE_OFF:CP_EYE;
  btn.title=show?'Hide password':'Show password';btn.setAttribute('aria-label',btn.title);
}
function cpRules(cur,nw){
  return {len:nw.length>=8,up:/[A-Z]/.test(nw),low:/[a-z]/.test(nw),num:/\d/.test(nw),
    sym:/[^A-Za-z0-9]/.test(nw),diff:!!nw&&nw!==cur};
}
// Ticks the checklist, fills the meter and says whether the two entries match.
function cpCheck(){
  const cur=cpVal('cp-current'),nw=cpVal('cp-new'),cf=cpVal('cp-confirm');
  const r=cpRules(cur,nw);
  document.querySelectorAll('.cp-rule').forEach(function(li){li.classList.toggle('is-ok',!!r[li.dataset.cp]);});
  const met=['len','up','low','num','sym'].filter(function(k){return r[k];}).length;
  const lvl=!nw?0:met<=2?1:met===3?2:met===4?3:4;
  const meter=document.getElementById('cp-meter');
  if(meter){meter.dataset.lvl=lvl;document.getElementById('cp-meter-lbl').textContent=['Enter a password','Weak','Fair','Good','Strong'][lvl];}
  const m=document.getElementById('cp-match');
  if(m){
    m.className='cp-match'+(cf?(cf===nw?' is-ok':' is-bad'):'');
    m.textContent=cf?(cf===nw?'Passwords match':'Passwords do not match'):'';
  }
  document.querySelectorAll('.cp-card .cp-input-wrap.is-err').forEach(function(w){
    if(w.querySelector('input').value)w.classList.remove('is-err');
  });
}
function cpReset(){
  ['cp-current','cp-new','cp-confirm'].forEach(function(id){const el=document.getElementById(id);if(el){el.value='';el.type='password';}});
  document.querySelectorAll('.cp-eye').forEach(function(b){b.innerHTML=CP_EYE;});
  document.querySelectorAll('.cp-card .is-err').forEach(function(w){w.classList.remove('is-err');});
  cpCheck();
}
function cpSubmit(){
  const cur=cpVal('cp-current'),nw=cpVal('cp-new'),cf=cpVal('cp-confirm');
  const empty=['cp-current','cp-new','cp-confirm'].filter(function(id){return !cpVal(id);});
  empty.forEach(function(id){document.getElementById(id).closest('.cp-input-wrap').classList.add('is-err');});
  if(empty.length){showToast('Some details are missing','error','Fill in all three password fields.');return;}
  const r=cpRules(cur,nw);
  if(!Object.keys(r).every(function(k){return r[k];})){
    document.getElementById('cp-new').closest('.cp-input-wrap').classList.add('is-err');
    showToast('Password too weak','error','The new password must meet every requirement listed.');return;
  }
  if(nw!==cf){
    document.getElementById('cp-confirm').closest('.cp-input-wrap').classList.add('is-err');
    showToast('Passwords do not match','error','Re-enter the new password exactly.');return;
  }
  cpReset();
  showToast('Password updated','success','Your password has been changed.');
}

// ── COMPANY SETTINGS PAGE ──
/* The listing holds one row: the active entity (header → Switch Entity),
   owned by its Entity Super Admin(s) in Roles & Access. */
function csEntityRows(){
  const e=typeof entitiesData!=='undefined'?entitiesData.find(function(x){return x.entityId===idEntity();}):null;
  if(!e)return getPageMeta('settings').rows||[];
  const owners=(typeof csRoles!=='undefined'?csRoles:[]).filter(function(r){return r.role==='Entity Super Admin'&&r.entityId===e.entityId;}).map(function(r){return idName(r.userId);});
  return [[1,e.name,e.entityId,e.type,e.country,owners.join(', ')||'OpenDhi','Today','Active']];
}
function buildCompanySettingsHTML(){
  const meta=getPageMeta('settings');
  const allRows=csEntityRows();
  const cols=meta.columns||[];
  const statusIdx=cols.findIndex(c=>c==='Status'||c==='status');
  const activeCount=statusIdx>=0?allRows.filter(r=>String(r[statusIdx]||'').toLowerCase()==='active').length:0;
  const inactiveCount=statusIdx>=0?allRows.filter(r=>String(r[statusIdx]||'').toLowerCase()==='inactive').length:0;
  const pendingCount=statusIdx>=0?allRows.filter(r=>String(r[statusIdx]||'').toLowerCase()==='pending').length:0;
  const csStatFilter=listStatusFilters['settings']||'';
  const csQuery=listSearchQueries['settings']||'';
  const rows=(csStatFilter&&statusIdx>=0)?allRows.filter(r=>String(r[statusIdx]||'').toLowerCase()===csStatFilter.toLowerCase()):allRows;
  const hamburger='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const headers=cols.map(c=>'<th>'+c+'</th>').join('')+'<th>ACTION</th>';
  // data-row-id is what markCsSelectedRow() moves the highlight by, without a repaint.
  const pgn=listPage('settings',csStatFilter+'|'+csQuery,lpSearchRows(rows,csQuery).map(row=>'<tr class="lp-row'+(csSelectedItem===row[0]?' lp-row-selected':'')+'" data-row-id="'+row[0]+'" onclick="openCsSidebar('+row[0]+')">'
    +row.map((cell,i)=>buildListingCell(cell,cols[i])).join('')
    +'<td><button class="lp-action-btn" title="More actions" onclick="event.stopPropagation();openCsSidebar('+row[0]+')">'+hamburger+'</button></td>'
    +'</tr>'),'<tr><td colspan="'+(cols.length+1)+'" style="padding:24px;text-align:center;color:var(--gray)">No records match this filter.</td></tr>');
  const filters=lpSearchField('lst-settings-q',csQuery,'Search',"applyListingFilters('settings')")
    +(meta.filters||[]).map((f,i)=>apCS('lst-settings-f'+i,getFilterOptions(f).slice(1),f==='Status'?csStatFilter:'',f)).join('');
  const sbInner=csSelectedItem?renderCsSidebar():'';
  return '<div class="listing-page">'
    +'<div class="listing-top">'
      +'<div class="lp-filter-bar" style="flex:1;min-width:0"><div class="lp-filter-bar-label">Select Filter</div>'
      +'<div class="lp-filter-bar-row">'+filters+clearFiltersBtn([csStatFilter,listSearchQueries['settings']||''],'resetListingFilters(\'settings\')')+'<button class="lp-pill-search" onclick="applyListingFilters(\'settings\')">Search</button></div></div>'
      +'<div class="listing-stats">'
        +'<div class="listing-stat active'+(csStatFilter==='Active'?' stat-selected':'')+'" onclick="toggleListingStatFilter(\'settings\',\'Active\')"><div class="listing-stat-count">'+activeCount+'</div><div class="listing-stat-label">Active</div></div>'
        +'<div class="listing-stat inactive'+(csStatFilter==='Inactive'?' stat-selected':'')+'" onclick="toggleListingStatFilter(\'settings\',\'Inactive\')"><div class="listing-stat-count">'+inactiveCount+'</div><div class="listing-stat-label">Inactive</div></div>'
        +'<div class="listing-stat pending'+(csStatFilter==='Pending'?' stat-selected':'')+'" onclick="toggleListingStatFilter(\'settings\',\'Pending\')"><div class="listing-stat-count">'+pendingCount+'</div><div class="listing-stat-label">Pending</div></div>'
      +'</div>'
    +'</div>'
    +'<div class="lp-split-wrap">'
      +'<div class="lp-split-main">'
        +'<div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
          +'<table class="lp-table" style="min-width:600px"><thead><tr>'+headers+'</tr></thead><tbody>'+pgn.rows+'</tbody></table>'
          +pgn.pager
        +'</div>'
      +'</div>'
      +'<div class="lp-split-sb'+(csSelectedItem?' open':'')+'" id="cs-isb">'
        +'<div class="lp-isb" id="cs-isb-inner">'+sbInner+'</div>'
      +'</div>'
    +'</div>'
  +'</div>';
}

function renderCsSidebar(){
  const editIcoSvg='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  const editBtn='<button class="lp-sb-view-edit-btn">'+editIcoSvg+' Edit</button>';
  const tabs=csVisibleTabs();
  /* A tab the role can no longer see (after a role switch) falls back to the first. */
  /* Someone whose only tab was Workflow (now removed) has none left: say so rather than fail. */
  if(!tabs.length)return '<div class="lp-isb-tabbar"><div class="lp-isb-tabs"></div><div class="lp-isb-right"><button class="lp-isb-close" onclick="closeCsSidebar()" title="Close">&times;</button></div></div>'
    +'<div class="lp-isb-body"><div class="lp-wf-empty">No company setting is available to your role.</div></div>';
  if(!tabs.some(function(t){return t.id===csTab;}))csTab=tabs[0].id;
  /* Sections on the bar, the section's own tabs underneath (CS_GROUPS). */
  const groups=csVisibleGroups(tabs),cur=csGroupOf(csTab);
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'cs-isb-tabs\')" title="Scroll left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>'
    +'<div class="lp-isb-tabs" id="cs-isb-tabs">'+groups.map(g=>'<button class="lp-isb-tab'+(cur&&cur.id===g.id?' active':'')+'" onclick="csSetGroup(\''+g.id+'\')">'+g.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'cs-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeCsSidebar()" title="Close"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';

  // SVG icons
  const iEnt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
  const iMap='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 6l7-3 8 4 7-3v15l-7 3-8-4-7 3z"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="7" x2="16" y2="21"/></svg>';
  const iCity='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>';
  const iGlobe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const iCal='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iPerson='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iId='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="7" y1="11" x2="10" y2="11"/><line x1="7" y1="15" x2="10" y2="15"/><path d="M14 11h3m-3 4h3"/></svg>';
  const iImg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  const iDoc='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  const iBank='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
  const iHash='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>';
  const iKey='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>';
  const iFlash='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
  const iDollar='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
  const iMail='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  const iPhone='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.07 6.07l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.76 16.92z"/></svg>';
  const iPct='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>';
  const iPaperclip='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';
  const iComment='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  const fc=(icon,label,value)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+icon+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+(value!=null?value:'<span style="color:#9ca3af">-</span>')+'</div></div></div>';
  const fcW=(icon,label,value)=>'<div class="lp-sb-field-card is-wide"><div class="lp-sb-field-icon">'+icon+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+(value!=null?value:'<span style="color:#9ca3af">-</span>')+'</div></div></div>';
  const dash='<span style="color:#9ca3af">-</span>';

  let body='';

  if(csTab==='basic-details'){
    /* The listing holds one row, the entity you are signed in to, so Basic
       Details is that entity's profile. Row: S. No, Entity, Entity ID, Type,
       Country, Owner, Updated, Status. */
    const row=csEntityRows().find(r=>r[0]===csSelectedItem)||[];
    const name=row[1]||'Opendhi';
    const fields=fc(iEnt,'Entity ID',row[2]||dash)+fc(iCity,'Entity Name',name)
      +fc(iFlash,'Entity Type',row[3]||dash)+fc(iGlobe,'Country',row[4]||dash)
      +(typeof bgBaseCurrencyFieldHTML==='function'?bgBaseCurrencyFieldHTML(fc,iDollar):'')
      +(typeof ccEntTzFieldHTML==='function'?ccEntTzFieldHTML(fc,iGlobe):'')
      +fcW(iMap,'Address','Flat No: 41204, Olive Block Indu Fortune Fields, Railway Station, Gardenia, near HITECH city, Phase 13, Kukatpally Housing Board Colony, Kukatpally, Hyderabad, Telangana 500085, India')
      +fc(iCity,'City','Hyderabad')+fc(iPerson,'Owner',row[5]||dash)
      +fc(iCal,'Created Time','12 Apr 2026 | 08:53 PM')+fc(iPerson,'Created By','Shaun Mathew')
      +fc(iCal,'Last Updated',row[6]||dash)+fc(iId,'Employee ID Pre fix','OPD')
      +fc(iImg,'Entity Logo',dash)+fc(iDoc,'Header',dash)+fc(iDoc,'Footer',dash);
    body=sbHero({icon:sbIco.building,name:name,meta:[row[2],row[3],row[4]],status:sbHeroBadge(row[7]),edit:editBtn})
      +'<div class="lp-sb-detail-grid">'+fields+'</div>';
  }
  else if(csTab==='attachments'){
    body=csAttachmentsTabHTML();   // agreements + uploads, see cs-agreements.js
  }
  else if(csTab==='esign'){
    /* The company's own header card first. The tab's DocuSeal card is the provider, not the record: as the first
       card it was taken for the record's header and then shown on top of every other tab (Payroll, Leaves …). */
    const row=csEntityRows().find(r=>r[0]===csSelectedItem)||[];
    body=sbHero({icon:sbIco.building,name:row[1]||'Opendhi',meta:[row[2],row[3],row[4]],status:sbHeroBadge(row[7])})
      +(typeof csEsignTabHTML==='function'?csEsignTabHTML():'');
  }
  else if(csTab==='banking-details'){
    const dlIco='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Banking Details</span>'+editBtn+'</div>'
      +'<div class="lp-sb-detail-grid">'
      +fc(iGlobe,'Country / Location','India')+fc(iPerson,'Pay Name','Opendhi')
      +fc(iBank,'Pay Bank','ICIC')+fc(iHash,'Account Number','223445565666')
      +fc(iKey,'IFSC Code','ICFHDE123')+fc(iFlash,'Swift Code','ICFHDE123')
      +fc(iDollar,'Currency','INR')+fc(iMail,'Email','shaun.varghese@opendhi.com')
      +fc(iPhone,'Phone Number','9949860707')+fc(iPct,'VAT Number',dash)
      +fc(iPaperclip,'Attachment','Screenshot<br><span style="color:var(--orange);font-size:11.5px;display:flex;align-items:center;gap:4px;margin-top:2px">'+dlIco+' Download</span>')
      +fc(iComment,'Comments',dash)
      +'</div>';
  }
  else if(csTab==='company-structure'){
    const subTabs=['Branch','Departments','Designation','Cost Centres','Projects','Signatories'];
    /* The same sub-tab strip as the section tabs above it (.cs-subtabs). */
    const subBar='<div class="cs-subtabs is-nested">'
      +subTabs.map(t=>{const id=t.toLowerCase().replace(/ /g,'-');return '<button type="button" class="cs-subtab'+(csStructureTab===id?' active':'')+'" onclick="csSetStructureTab(\''+id+'\')">'+t+'</button>';}).join('')
      +'</div>';
    let sub='';
    if(csStructureTab==='branch'){
      /* Branches are the attendance work locations — one list, owned by
         attendance-settings.js, so the radius reads the same on both tabs. */
      sub=csBranchTabHTML();
    }else if((csStructureTab==='departments'||csStructureTab==='designation')&&typeof csStructTabHTML==='function'){
      /* The masters benefit policies scope by - js/cs-structure.js. */
      sub=csStructTabHTML(csStructureTab);
    }else if((csStructureTab==='cost-centres'||csStructureTab==='projects')&&typeof bgmTabHTML==='function'){
      /* Budget dimensions, per entity - js/budgets.js. */
      sub=bgmTabHTML(csStructureTab==='projects'?'project':'cc');
    }else{
      sub='<div style="padding:40px;text-align:center;color:#9ca3af;font-size:13px">No records found.</div>';
    }
    body=subBar+sub;
  }
  else if(csTab==='roles-access'){
    body=csRolesTabHTML();   // js/cs-roles.js: the table and the inline Add / Edit Role form
  }
  else if(csTab==='payroll'){
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Payroll Settings</span>'+editBtn+'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'
      +fc(iPerson,'Pay Cycle','Monthly')+fc(iCal,'Payroll cut-off Date','31th')
      +fc(iCal,'Payroll Calendar','Mar 31 - Apr 29')+fc(iDollar,'Currency','INR')
      +fcW(iCal,'Payslip Publish Date','5th Of Following Month')
      +'</div>'
      +'<div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:10px">Payroll Input Rules</div>'
      +'<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:4px 14px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f1f5f9">'
      +'<span style="font-size:13px;color:var(--navy)">Include Approved Expenses in Payroll</span>'
      +'<label class="cs-toggle"><input type="checkbox"'+(typeof caPayrollOn!=='function'||caPayrollOn()?' checked':'')+' onchange="caPayrollToggle(this.checked)"><span class="cs-toggle-slider"></span></label></div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0">'
      +'<span style="font-size:13px;color:var(--navy)">Deduct Unpaid Leave Automatically</span>'
      +'<label class="cs-toggle"><input type="checkbox" checked><span class="cs-toggle-slider"></span></label></div>'
      +'</div>';
  }
  else if(csTab==='leaves'){
    /* The four leave-year facts and the type table were written inline here
       with their styles repeated on every cell, and none of it could be
       changed. js/leave-settings.js owns the tab now — the same four facts
       plus the restrictions, the sandwich rule and the approval workflow,
       with a working edit mode. */
    body=csLeavesTabHTML();
  }
  else if(csTab==='attendance'){
    /* Six read-only cards that could not be changed and did not describe how
       attendance is actually configured. js/attendance-settings.js owns the
       real set now — working hours, grace, freeze, week-off requests,
       absconding flow and the geofence — with a working edit mode. */
    body=csAttendanceTabHTML();
  }
  else if(csTab==='module-control'){body=mcTabHTML();}
  else if(csTab==='presentation-data'&&typeof presTabHTML==='function'){body=presTabHTML();}   // presentation environment only (js/presentation.js)
  else if(csTab==='card-programmes'){body=oncProgrammeTabHTML();}
  else if(csTab==='exchange-rates'){body=epRatesTabHTML();}
  else if(csTab==='onc-enrollment'){body=oncSettingsTabHTML();}
  else if(csTab==='rbl-registry'){body=oncSettingsTabHTML();}   // merged into Card Enrollment (10 Nov 2026)
  else if(csTab==='history'){body=sbHistoryHTML(csHistRec(csSelectedItem));}
  else if(csTab==='logs'){
    const form='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--active"></span>Active</div>'
      +'<p class="lp-logs-form-sub">Update entity status and add a comment</p>'
      +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
      +apCS('cs-log-status-sel',['Active','Inactive'],'','Select Status')
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="cs-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<button class="lp-logs-save-btn" onclick="csSaveLog()">Save</button>'
      +'</div>';
    body=lpLogsView(typeof csLogsAll==='function'?csLogsAll():csLogsData,form)+(typeof idMigrationHTML==='function'?idMigrationHTML():'');   // settings changes too (js/ems-logs.js)
  }
  else if(csTab==='workflow'){
    body=(typeof eaWfSectionHTML==='function'?eaWfSectionHTML():'')+wfTimelineHTML(csWorkflowData);   // approval routes: js/expenses-advances.js
  }

  /* A section with a single tab needs no strip under it — the section tab says it all. */
  const curTabs=cur?tabs.filter(function(t){return cur.tabs.indexOf(t.id)>=0;}):[];
  const subBar=curTabs.length>1?'<div class="cs-subtabs" role="tablist" aria-label="'+attrSafe(cur.label)+'">'
    +curTabs.map(function(t){
      return '<button type="button" class="cs-subtab'+(csTab===t.id?' active':'')+'" onclick="csSetTab(\''+t.id+'\')">'+t.label+'</button>';}).join('')
    +'</div>':'';
  return tabBar+'<div class="lp-isb-body">'+subBar+body+'</div>';
}
/* ── Company Settings: sections ──
   The entity panel's tabs, grouped. Each section opens on its first tab the
   person may see; a section with none is not shown. Module Control is its
   own tab and stays there whatever modules are switched off
   (only its RBAC right, platform.module.control, decides who sees it). */
const CS_GROUPS=[
  /* Company Information is split: Basic Details is the entity's profile alone,
     and Banking Details, Company Structure and Attachments are tabs of their own. */
  {id:'company',label:'Basic Details',tabs:['basic-details']},
  {id:'banking',label:'Banking Details',tabs:['banking-details']},
  /* Company Structure is its own page now: Administration → Company Structure (js/company-structure.js). */
  {id:'attachments',label:'Attachments',tabs:['attachments']},
  {id:'people',label:'Users',tabs:['roles-access']},
  /* HR & Payroll is split the same way: Payroll, Leaves and Attendance are tabs of their own. */
  {id:'hr',label:'Payroll',tabs:['payroll']},
  {id:'leaves',label:'Leaves',tabs:['leaves']},
  {id:'attendance',label:'Attendance',tabs:['attendance']},
  /* No Expense & Cards section (12 Nov 2026): Exchange Rates is removed, and Card Programmes and Card Enrollment
     moved to Corporate Cards → Card Setup (js/card-setup.js). */
  /* Platform & Integrations is split: Module Control and E-Sign are tabs of their own. */
  {id:'platform',label:'Module Control',tabs:['module-control']},
  {id:'esign',label:'E-Sign',tabs:['esign']}
  /* No Workflow, Logs or History tab (product owner, 12 Nov 2026). Workflow held the approval routes (Expense Claims,
     Advance Requests, Imprest Requests): the routes already set keep applying, but none can be added or changed from
     the app while this tab is gone. Logs held the entity status move and the ID migration report. */
];
function csVisibleTabs(){
  const base=[
    {id:'basic-details',label:'Basic Details'},{id:'banking-details',label:'Banking Details'},
    {id:'company-structure',label:'Company Structure'},{id:'attachments',label:'Attachments'},
    {id:'roles-access',label:'Roles & Access'},
    {id:'payroll',label:'Payroll'},{id:'leaves',label:'Leaves'},{id:'attendance',label:'Attendance'},
    {id:'esign',label:'E-Sign'},
    {id:'workflow',label:'Workflow'},{id:'logs',label:'Logs'},{id:'history',label:'History'}
  ].concat(typeof csExtraTabs==='function'?csExtraTabs():[]);   // Expense Management tabs (js/ems-access.js csExtraTabs)
  /* In section order. */
  const order=[];CS_GROUPS.forEach(function(g){order.push.apply(order,g.tabs);});
  return base.filter(function(t){return order.indexOf(t.id)>=0;}).sort(function(a,b){return order.indexOf(a.id)-order.indexOf(b.id);});
}
function csVisibleGroups(tabs){
  tabs=tabs||csVisibleTabs();
  return CS_GROUPS.filter(function(g){return tabs.some(function(t){return g.tabs.indexOf(t.id)>=0;});});
}
function csGroupOf(tab){return CS_GROUPS.find(function(g){return g.tabs.indexOf(tab)>=0;})||null;}
function csSetGroup(gid){
  const g=CS_GROUPS.find(function(x){return x.id===gid;});if(!g)return;
  const first=csVisibleTabs().find(function(t){return g.tabs.indexOf(t.id)>=0;});
  if(first)csSetTab(first.id);
}

/* ── GENERIC LISTING SIDEBAR ──
   The detail panel behind the action button on every listing that has no
   bespoke one (Payheads, Users, People, Teams, Contracts, Payments, Support…).
   Its Basic Details tab is generated from the page's own columns, so each page
   gets a correct panel without a hand-written renderer, and a column added to a
   listing shows up here automatically. */
const lstNouns={payheads:'Payhead','all-users':'User','all-leaves':'Leave Request',people:'Person',
  teams:'Team',contracts:'Contract',payments:'Invoice',settings:'Setting',support:'Ticket',
  leaves:'Leave',dashboard:'Metric'};
function renderLstSidebar(){
  const editBtn='<button class="lp-sb-view-edit-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>';
  const row=getLstSelectedRow();
  const meta=getPageMeta(lstSelectedPg);
  const cols=meta.columns||[];
  const noun=lstNouns[lstSelectedPg]||String(meta.title||'Record').replace(/s$/,'');
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  const chevL='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>';
  const chevR='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
  const xIco='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'lst-isb-tabs\')" title="Scroll left">'+chevL+'</button>'
    +'<div class="lp-isb-tabs" id="lst-isb-tabs">'+tabs.map(function(t){return '<button class="lp-isb-tab'+(lstTab===t.id?' active':'')+'" onclick="navLstTab(\''+t.id+'\')">'+t.label+'</button>';}).join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'lst-isb-tabs\')" title="Scroll right">'+chevR+'</button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeLstSidebar()" title="Close">'+xIco+'</button></div>'
    +'</div>';
  // A record can be filtered out from under an open panel — say the status
  // filter changes. Say so rather than rendering an empty shell.
  if(!row)return tabBar+'<div class="lp-isb-body"><div class="lp-wf-empty">This '+noun.toLowerCase()+' is no longer in the filtered list.</div></div>';

  const i={
    user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>',
    money:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
  };
  // Pick the field icon from the column's own name, so the panel reads like the
  // hand-built ones without a per-page icon map to maintain.
  const pickIco=function(label){
    const l=String(label).toLowerCase();
    if(/status/.test(l))return i.check;
    if(/email/.test(l))return i.mail;
    if(/employees|members|headcount/.test(l))return i.users;
    if(/name|employee|owner|user|person|requester|full name/.test(l))return i.user;
    if(/country|location|region|scope|branch/.test(l))return i.globe;
    if(/date|updated|start|period|dates|last active/.test(l))return i.cal;
    if(/amount|pay|gross|value|salary|rate|cost|calculation/.test(l))return i.money;
    if(/type|category|role|worker|topic|area|applies/.test(l))return i.tag;
    if(/hours|time|cycle|trend/.test(l))return i.clock;
    return i.doc;
  };
  const fc=function(ico,label,val){
    return '<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+ico+'</div>'
      +'<div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div>'
      +'<div class="lp-sb-field-value">'+(val!=null&&val!==''?val:'<span style="color:#9ca3af">-</span>')+'</div></div></div>';
  };

  let body='';
  if(lstTab==='basic-details'){
    const fields=cols.map(function(c,ci){
      if(c==='S.No'||c==='S. No')return '';
      const raw=row[ci];
      const val=(c==='Status'||c==='status')?sbStatus(raw):raw;
      return fc(pickIco(c),c,val);
    }).join('');
    // Same header card as every bespoke panel: the row's first column names
    // it, the next two identify it, and its Status column is the badge.
    const txt=function(v){return String(v==null?'':v).replace(/<[^>]*>/g,'').trim();};
    const named=cols.map(function(c,ci){return {c:c,v:txt(row[ci])};})
      .filter(function(x){return x.v&&!/^S\.? ?No$/.test(x.c)&&!/^status$/i.test(x.c);});
    const stIdx=cols.findIndex(function(c){return /^status$/i.test(c);});
    const hero=function(editing){return sbHero({icon:i.doc,name:named.length?named[0].v:noun,meta:named.slice(1,3).map(function(x){return x.v;}),
        status:stIdx>=0?sbHeroBadge(txt(row[stIdx])):'',editing:editing,edit:sbEditBtnFor('lst',lstSelectedId)});};
    body=sbIsEditing('lst',lstSelectedId)?hero(true)+sbEditFormHTML('lst',row)
      :hero(false)+'<div class="lp-sb-detail-grid">'+fields+'</div>';
  }
  else if(lstTab==='history'){body=sbHistoryHTML(row);}
  else if(lstTab==='logs'){
    const logs=getLstLogs();
    // Only these have styled variants; anything else falls back to grey rather
    // than rendering an invisible dot and a transparent avatar.
    const styled={active:1,inactive:1,pending:1,approved:1,unapproved:1};
    const lsk=function(s){const k=statusClass(s||'Active');return styled[k]?k:'default';};
    // Offer the states this listing actually uses — Leaves are Approved /
    // Unapproved, everything else is Active / Inactive.
    const opts=(lstSelectedPg==='leaves'||lstSelectedPg==='all-leaves')
      ? ['Approved','Unapproved','Pending']
      : ['Active','Inactive','Pending'];
    const cur=lstRowStatus(row)||opts[0];
    const form='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+lsk(cur)+'"></span>'+cur+'</div>'
      +'<p class="lp-logs-form-sub">Update '+noun.toLowerCase()+' status and add a comment</p>'
      +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
      +apCS('lst-log-status-sel',opts,'','Select Status')
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="lst-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<button class="lp-logs-save-btn" onclick="lstSaveLog()">Save</button>'
      +'</div>';
    body=lpLogsView(logs,form);
  }
  else if(lstTab==='workflow'){
    const lstDone=wfDoneFromLogs(getLstLogs());
    body=wfTimelineHTML(wfApproval({status:lstRowStatus(row)},lstDone,'Admin'));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}

// ── TICKETS PAGE ──
function renderTkSidebar(){
  const t=ticketsData.find(x=>x.id===tkSelectedId);if(!t)return '';
  /* The Conversation tab reads the CSM chat this ticket came out of, so it only
     belongs to a chat-borne one. On a request raised through the portal, inbox
     or a phone call there is no conversation to show — the tab is dropped
     rather than left to render an empty transcript, and a panel already sitting
     on it falls back to Basic Details. */
  const hasChat=tkIsChat(t);
  if(!hasChat&&tkTab==='conversation')tkTab='basic-details';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'}]
    .concat(hasChat?[{id:'conversation',label:'Conversation'}]:[])
    .concat([{id:'attachments',label:'Attachments'},{id:'assignment',label:'Assignment'},{id:'workflow',label:'Workflow'}]);
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'tk-isb-tabs\')" title="Scroll left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>'
    +'<div class="lp-isb-tabs" id="tk-isb-tabs">'+tabs.map(tb=>'<button class="lp-isb-tab'+(tkTab===tb.id?' active':'')+'" onclick="navTkTab(\''+tb.id+'\')">'+tb.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'tk-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeTkSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const iUser='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iMail='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  const iPhone='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41A2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.2.73.43 1.44.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.9.34 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  const iGlobe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const iTag='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const iCal='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iDoc='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  const fc=(icon,label,value)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+icon+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+(value!=null?value:'<span style="color:#9ca3af">-</span>')+'</div></div></div>';
  const fcW=(icon,label,value)=>'<div class="lp-sb-field-card is-wide"><div class="lp-sb-field-icon">'+icon+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+(value!=null?value:'<span style="color:#9ca3af">-</span>')+'</div></div></div>';
  const thS='padding:8px 10px;text-align:left;font-size:10.5px;font-weight:600;color:#6b7280;background:#f8fafc;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.4px';
  let body='';
  if(tkTab==='basic-details'){
    /* BASIC DETAILS READS, IT DOES NOT ACT. The move buttons used to sit right
       here in a coloured card, which put the same decision in two places: the
       card, and the Logs form that actually collects the comment every move
       requires. The card was the worse of the two — it fired a modal over the
       panel you were already reading, and a move made from it still had to be
       explained afterwards. So the buttons live on Logs now, next to the
       history they are about to be written into. What stays here is the fact,
       not the control: who owes the next action, as an ordinary field. */
    const res=tkResolution(t);
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Client Information</span></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'
      +fc(iUser,'Client Name',t.clientName)+fc(iMail,'Email',t.clientEmail)
      +fc(iPhone,'Phone',t.clientPhone)+fc(iGlobe,'Country',t.country)
      +'</div>'
      +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Ticket Information</span></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'
      +fc(iTag,'Ticket ID',t.ticketId)+fc(iTag,'Category',t.category)
      +fc(iCal,'Created At',t.createdAt)+fc(iUser,'Assigned To',t.assignedTo)
      // Where it came in, and who put it there — the same panel serves both
      // queues, so it has to say which one this record belongs to.
      +fc(iTag,'Raised Via',tkSourceLabel(t))+fc(iUser,'Raised By',t.raisedBy)
      +fc(iTag,'Status',sbStatus(t.status,tkStatusLabel(t.status)))
      // Stated, not offered — the control that changes it is on Logs.
      +fc(iUser,'Next Action On',tkOwner(t))
      +(t.status==='blocked'?fc(iGlobe,'Blocked On',t.waitingOn):'')
      +'</div>'
      // Read out of the Logs, not out of a field on the ticket - see the note
      // on TK_FLOW. The link goes to the entry it came from.
      +(res
        ? '<div class="lp-sb-view-header"><span class="lp-sb-section-title">'
          // After a rejection the ticket is back in progress but the entry is
          // still in the log, and it is the most useful thing on the panel -
          // it says what has already been tried. The heading is what changes.
          +(t.status==='resolved'||t.status==='closed'?'Resolution':'Last Proposed Resolution')+'</span>'
          +'<button class="lp-sb-section-link" onclick="navTkTab(\'logs\')">View in Logs</button></div>'
          +'<div style="display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:16px">'+fcW(iDoc,'What was done',res)+'</div>'
        : '')
      +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Description</span></div>'
      +'<div style="display:grid;grid-template-columns:1fr;gap:10px">'+fcW(iDoc,'Details',t.description)+'</div>';
  }else if(tkTab==='conversation'){
    const initials=t.clientName.split(' ').map(n=>n[0]).join('').slice(0,2);
    body='<div style="display:flex;flex-direction:column;gap:12px">'
      +'<div style="background:#f8fafc;border:1.5px solid var(--border);border-radius:10px;padding:14px 16px">'
      +'<div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Trigger Message</div>'
      +'<p style="margin:0;font-size:13px;color:#374151;line-height:1.5">'+t.description+'</p></div>'
      +'<div style="background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:10px;padding:14px 16px">'
      +'<div style="font-size:11px;font-weight:700;color:#0284c7;margin-bottom:8px;display:flex;align-items:center;gap:5px"><svg width="11" height="11" viewBox="0 0 24 24" fill="var(--orange)" stroke="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>AI Summary</div>'
      +'<p style="margin:0;font-size:12.5px;color:#374151;line-height:1.5">'+t.clientName+' raised a '+t.category.toLowerCase()+'-related issue ('+t.ticketId+') on '+t.createdAt+'. Assigned to '+t.assignedTo+'. Status: '+sbStatus(t.status,tkStatusLabel(t.status))+'.</p></div>'
      +'<div>'
      +'<div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px">Chat Thread</div>'
      +'<div style="display:flex;gap:8px;margin-bottom:12px"><div style="width:28px;height:28px;border-radius:50%;background:#e0e7ff;color:#4f46e5;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+initials+'</div><div style="flex:1"><div style="font-size:11px;font-weight:600;color:var(--navy);margin-bottom:3px">'+t.clientName+' <span style="color:#9ca3af;font-weight:400">· '+t.createdAt+'</span></div><div style="background:#f1f5f9;border-radius:0 8px 8px 8px;padding:8px 12px;font-size:12.5px;color:#374151;line-height:1.4">'+t.description+'</div></div></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px"><div style="flex:1;display:flex;justify-content:flex-end"><div><div style="font-size:11px;font-weight:600;color:var(--navy);margin-bottom:3px;text-align:right">'+t.assignedTo+' <span style="color:#9ca3af;font-weight:400">· Today</span></div><div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px 0 8px 8px;padding:8px 12px;font-size:12.5px;color:#374151;line-height:1.4">Thank you for reaching out. We are looking into this and will respond shortly.</div></div></div><div style="width:28px;height:28px;border-radius:50%;background:#fff7ed;color:#ea580c;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">PP</div></div>'
      +'<div style="display:flex;gap:8px;padding-top:10px;border-top:1px solid var(--border)"><input style="flex:1;height:34px;border:1.5px solid var(--border);border-radius:var(--r-input);padding:0 12px;font-size:13px;font-family:inherit;outline:none;color:var(--navy)" placeholder="Type a reply…"><button style="height:34px;padding:0 16px;background:var(--orange);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Send</button></div>'
      +'</div></div>';
  }else if(tkTab==='attachments'){
    body=attachTabHTML('tk',tkSelectedId);
  }else if(tkTab==='assignment'){
    // The agent list comes from TK_AGENTS so this tab and the confirm dialog's
    // "Assign to" field can never offer different people.
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Current Assignment</span></div>'
      +'<div class="lp-sb-detail-grid" style="margin-bottom:20px">'
      +fc(iUser,'Assigned To',t.assignedTo)+fc(iCal,'Since',t.createdAt)
      +fc(iUser,'Next Action On',tkOwner(t))
      +'</div>'
      +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Reassign Ticket</span></div>'
      +'<div style="display:flex;flex-direction:column;gap:10px">'
      +'<div><div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:5px">Select Agent <span class="lp-logs-form-req">*</span></div>'
      +'<select id="tk-reassign-sel" style="width:100%;height:38px;border:1.5px solid var(--border);border-radius:8px;padding:0 12px;font-size:13px;font-family:inherit;outline:none;color:var(--navy);background:#fff"><option value="">Choose assignee…</option>'
      +TK_AGENTS.map(a=>'<option'+(a===t.assignedTo?' selected':'')+'>'+a+'</option>').join('')
      +'</select></div>'
      +'<div><div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:5px">Reason <span class="lp-logs-form-req">*</span></div><textarea id="tk-reassign-note" style="width:100%;height:72px;border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;outline:none;color:var(--navy);resize:none;box-sizing:border-box" placeholder="Why is this moving, and what does the new assignee need to know?"></textarea></div>'
      +'<button onclick="tkReassign('+t.id+')" style="align-self:flex-start;height:34px;padding:0 20px;background:var(--orange);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Reassign</button>'
      +'</div>';
  }else if(tkTab==='history'){
    body=sbHistoryHTML(t);
  }else if(tkTab==='logs'){
    body=tkLogsTabHTML(t);
  }else if(tkTab==='workflow'){
    body=wfTimelineHTML(wfTicket(t));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}

// ── Ticket Logs tab ───────────────────────────────────────────────────────
// The same two-part layout every other module's Logs tab uses: the history,
// then the form that adds to it. What differs is the status field - it is not
// a free list of every status, it is exactly the moves TK_FLOW allows out of
// where this ticket is now. So the form cannot write a transition the row
// action would refuse, and "Closed" simply is not on the menu until somebody
// has resolved the ticket.
// Maps to the tone modifiers leaves.css already defines, and to the same tone
// each status gets in tkStatusBadge(), so the log dot and the table pill agree.
function tkLogStatusKey(s){
  return ({Open:'info','In Progress':'wait',Blocked:'bad',Resolved:'ok',Closed:'idle'})[s]||'default';
}
function tkLogsTabHTML(t){
  const logs=seedLogs(t,tkLogsData[t.id]);
  const moves=tkMoves(t);
  const csk=tkLogStatusKey(tkStatusLabel(t.status));
  if(!moves.length)return lpLogsView(logs,'',{current:tkStatusLabel(t.status)});
  const form='<div class="lp-logs-form">'
    +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+csk+'"></span>'+tkStatusLabel(t.status)+'</div>'
    +'<p class="lp-logs-form-sub">Next action on <strong>'+tkOwner(t)+'</strong></p>'
    +'<div class="lp-logs-form-label">Move to <span class="lp-logs-form-req">*</span></div>'
    +apCS('tk-log-status-sel',moves.map(tkMoveLabel),'','Select the next step','tkLogStatusHook')
    // Only rendered when the chosen move needs it; tkLogFormSync toggles these.
    +'<div id="tk-log-assignee-wrap" style="display:none">'
    +'<div class="lp-logs-form-label">Assign to <span class="lp-logs-form-req">*</span></div>'
    +apCS('tk-log-assignee-sel',TK_AGENTS,t.assignedTo||'','Select an agent')+'</div>'
    +'<div id="tk-log-waiting-wrap" style="display:none">'
    +'<div class="lp-logs-form-label">Waiting on <span class="lp-logs-form-req">*</span></div>'
    +apCS('tk-log-waiting-sel',TK_BLOCKERS,t.waitingOn||'','Who are we blocked on?')+'</div>'
    +'<div class="lp-logs-form-label" id="tk-log-comment-label">Comment <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="lp-logs-form-textarea" id="tk-log-comment-inp" placeholder="Pick a step above, then say what happened"></textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px">'
    +'<button class="ep-cancel-btn" style="flex:1" onclick="tkCancelLog()">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="tkSaveLog('+t.id+')">Submit</button>'
    +'</div></div>';
  // What tkApply writes: the status, the assignee and blocker the move asks
  // for, and so who the ticket is with next.
  const mvFor=function(v){return moves.find(function(m){return tkMoveLabel(m)===v;});};
  return lpLogsView(logs,form,{owner:tkOwner(t),
    // Context per move: the issue when work starts, restarts or is resolved,
    // who confirms when it closes, what it was waiting on when it unblocks.
    // Blocking needs nothing - the blocker is picked in the form itself.
    aiContext:function(v){
      const mv=mvFor(v);if(!mv)return null;
      const age=Math.floor((new Date()-new Date(t.createdAt))/864e5);
      const raised={label:'Raised',value:t.createdAt?t.createdAt+(age>=0?' · '+age+' day'+(age===1?'':'s')+' ago':''):'',
        state:age>7&&mv.to!=='closed'?'warn':'',note:age>7&&mv.to!=='closed'?'Open more than a week':''};
      const issue={label:'Issue',value:t.description,wide:true};
      if(mv.to==='blocked')return null;
      if(t.status==='blocked')return {title:'What it was waiting on',rows:[{label:'Waiting On',value:t.waitingOn},raised]};
      if(mv.to==='closed')return {title:'Who confirms the fix',rows:[
        {label:'Client',value:t.clientName},{label:'Email',value:t.clientEmail},{label:'Phone',value:t.clientPhone}]};
      if(mv.to==='resolved')return {title:'What is being resolved',rows:[
        {label:'Category',value:t.category},raised,
        {label:'Confirms With',value:t.clientName+(t.clientEmail?' · '+t.clientEmail:'')},issue]};
      return {title:t.status==='open'?'What the work is':'The issue being picked up again',rows:[
        {label:'Category',value:t.category},
        {label:'Client',value:t.clientName+(t.country?' · '+t.country:'')},raised,issue]};
    },
    // Only proposing a resolution is submitted for the client to confirm.
    aiWhen:function(v){const mv=mvFor(v);return !!mv&&mv.to==='resolved';},
    aiLogStatus:function(v){const mv=mvFor(v);return mv?tkStatusLabel(mv.to):v;},
    aiFields:function(v){
      const mv=mvFor(v);if(!mv)return [];
      const asg=function(){return mv.needs.indexOf('assignee')>=0?getCSValue('tk-log-assignee-sel'):t.assignedTo;};
      const wait=function(){return mv.to==='blocked'?getCSValue('tk-log-waiting-sel'):'';};
      const rows=[{label:'Ticket Status',from:tkStatusLabel(t.status),to:tkStatusLabel(mv.to)}];
      if(mv.needs.indexOf('assignee')>=0)rows.push({label:'Assigned To',from:t.assignedTo,to:asg});
      if(mv.to==='blocked')rows.push({label:'Waiting On',from:t.waitingOn,to:wait});
      else if(t.waitingOn)rows.push({label:'Waiting On',from:t.waitingOn,to:'Cleared'});
      rows.push({label:'Next Action On',from:tkOwner(t),to:function(){
        return tkOwner(Object.assign({},t,{status:mv.to,assignedTo:asg()||t.assignedTo,waitingOn:wait()}));}});
      return rows;
    }});
}
/* The dropdown shows a move's label; the record stores its target status, so
   one builder writes the label and one lookup reads it back. */
function tkMoveLabel(mv){return mv.label+' → '+tkStatusLabel(mv.to);}
function tkPickedMove(t){
  const picked=getCSValue('tk-log-status-sel');
  return tkMoves(t).find(function(m){return tkMoveLabel(m)===picked;});
}
/* apCS's hook: it fires on selection, where the native control fired onchange. */
function tkLogStatusHook(){if(tkSelectedId)tkLogFormSync(tkSelectedId);}
// Show only the extra fields the chosen move actually needs, and ask that
// move's own question in the comment label.
function tkLogFormSync(id){
  const t=ticketsData.find(x=>x.id===id);if(!t)return;
  const mv=tkPickedMove(t);
  const show=(el,on)=>{const n=document.getElementById(el);if(n)n.style.display=on?'':'none';};
  show('tk-log-assignee-wrap',!!(mv&&mv.needs.indexOf('assignee')>=0));
  show('tk-log-waiting-wrap',!!(mv&&mv.needs.indexOf('waitingOn')>=0));
  const lab=document.getElementById('tk-log-comment-label');
  const inp=document.getElementById('tk-log-comment-inp');
  if(lab)lab.innerHTML=(mv&&mv.commentLabel?mv.commentLabel:'Comment')+' <span class="lp-logs-form-req">*</span>';
  if(inp)inp.placeholder=mv?mv.ask:'Pick a step above, then say what happened';
}
function tkCancelLog(){
  const inp=document.getElementById('tk-log-comment-inp');
  csClear('tk-log-status-sel');
  if(inp)inp.value='';
  if(typeof tkLogFormSync==='function'&&tkSelectedId)tkLogFormSync(tkSelectedId);
}
// Commits through qaTicketApply so this form, the row button and the panel
// button all write the same history for the same move.
function tkSaveLog(id){
  const t=ticketsData.find(x=>x.id===id);if(!t)return;
  const sel=csTrigger('tk-log-status-sel');
  const inp=document.getElementById('tk-log-comment-inp');
  const flash=el=>{if(el){el.style.borderColor='#b83a3a';setTimeout(()=>{el.style.borderColor='';},1500);el.focus();}};
  const mv=tkPickedMove(t);
  if(!mv){flash(sel);return;}
  const to=mv.to;
  const vals={comment:inp?inp.value.trim():''};
  /* Both are apCS dropdowns, so they are read by id - `asg` and `wait` were
     never declared, and any move needing them threw instead of saving. */
  if(mv.needs.indexOf('assignee')>=0){
    vals.assignee=getCSValue('tk-log-assignee-sel');
    if(!vals.assignee){flash(csTrigger('tk-log-assignee-sel'));return;}
  }
  if(mv.needs.indexOf('waitingOn')>=0){
    vals.waitingOn=getCSValue('tk-log-waiting-sel');
    if(!vals.waitingOn){flash(csTrigger('tk-log-waiting-sel'));return;}
  }
  if(!vals.comment){flash(inp);return;}
  tkTab='logs';                       // stay where the user was working
  qaTicketApply(id,to,vals);
}

// Reassignment is an action like any other: it needs a person AND a reason,
// and it lands in the ticket's timeline so the next agent can see why it
// arrived. A reassign does not change the status - only who owes the action.
function tkReassign(id){
  const t=ticketsData.find(x=>x.id===id);if(!t)return;
  const sel=document.getElementById('tk-reassign-sel');
  const note=document.getElementById('tk-reassign-note');
  const who=sel?sel.value:'';
  const why=note?note.value.trim():'';
  const flash=el=>{if(el){el.style.borderColor='#b83a3a';setTimeout(()=>{el.style.borderColor='';},1500);el.focus();}};
  if(!who){flash(sel);return;}
  if(!why){flash(note);return;}
  if(who===t.assignedTo){flash(sel);showToast('Already assigned','info',t.ticketId+' is already with '+who);return;}
  const from=t.assignedTo;
  t.assignedTo=who;
  // Both histories, same as every other ticket action. A reassign does not
  // move the status, so the log entry keeps the status the ticket is already
  // in rather than inventing one.
  wfPush(tkWorkflowData,id,'Reassigned',why+' (from '+from+' to '+who+')');
  logPush(t,tkLogsData[id],tkStatusLabel(t.status),why+' (Reassigned from '+from+' to '+who+')');
  renderADTPage();
  showToast('Ticket reassigned','success',t.ticketId+' · '+from+' → '+who);
}

/* ══ SUPPORT › TICKETS ══════════════════════════════════════════════════════
   ONE queue, whatever channel the ticket came in on — CSM chat, the client
   portal, a phone call to the desk, or raised internally by the Opendhi team.
   These were briefly two pages; an agent works one queue, and having to check
   two of them to know what is open was the whole problem with that.

   Channel survives as a column and a filter, which is all it ever needed to
   be. The one place it genuinely changes behaviour is the detail panel, where
   a chat-borne ticket gets the Conversation tab and the others do not —
   gated in renderTkSidebar() off tkIsChat(). */
function tkToggleStatFilter(v){
  tkQuickStatusFilter=tkQuickStatusFilter===v?'':v;
  tkSelectedId=null;
  renderADTPage();
}
// Kept as its own name because the Unassigned tile and anything else that
// asks for that view by name should not have to know the sentinel.
function tkToggleUnassigned(){tkToggleStatFilter('__unassigned__');}
/* Entry point for the CSM dashboard cards. Unlike the tiles this SETS the
   filter rather than toggling it - arriving from a dashboard card that reads
   "Blocked 3" and landing on an unfiltered queue because the filter happened
   to already be Blocked would be a bug, not a toggle. The channel filter is
   cleared for the same reason: the card counted the whole queue. */
function tkGoStatus(key){
  tkQuickStatusFilter=key||'';
  tkChannelFilter='';
  tkSelectedId=null;
  navigatePage('support-tickets',true);
}
function applyTkFilters(){
  const status=getCSValue('tk-f-status');
  const channel=getCSValue('tk-f-channel');
  tkQuickStatusFilter=status&&status!=='All Statuses'?status:'';
  tkChannelFilter=channel&&channel!=='All Channels'?channel:'';
  tkSearchQuery=lpSearchValue('tk-f-q');
  tkSelectedId=null;
  renderADTPage();
}
function resetTkFilters(){
  tkQuickStatusFilter='';tkChannelFilter='';tkSearchQuery='';
  tkSelectedId=null;
  renderADTPage();
}
function tkIsUnassigned(t){return !t.assignedTo;}
/* "Unresolved" is every ticket still costing someone work - open, being
   worked, or stuck. Like __unassigned__ it cuts ACROSS the statuses instead
   of being one of them, which is why both are spelled with the __sentinel__
   the dropdown knows to ignore. */
const TK_UNRESOLVED=['open','in_progress','blocked'];
function tkIsUnresolved(t){return TK_UNRESOLVED.indexOf(t.status)>=0;}
function tkIsPseudoStatus(v){return typeof v==='string'&&v.slice(0,2)==='__';}
// Channel narrows first so the count tiles can be scored against it: filtering
// to Phone Call and still seeing the whole queue's Open count would be a lie.
function tkScope(){
  if(!tkChannelFilter)return ticketsData;
  return ticketsData.filter(function(t){return tkSourceLabel(t)===tkChannelFilter;});
}
function tkRows(){
  const rows=tkScope();
  if(tkQuickStatusFilter==='__unassigned__')return rows.filter(tkIsUnassigned);
  if(tkQuickStatusFilter==='__unresolved__')return rows.filter(tkIsUnresolved);
  return tkQuickStatusFilter?rows.filter(function(t){return t.status===tkQuickStatusFilter;}):rows;
}

/* ── Create Ticket ─────────────────────────────────────────────────────────
   Raised from inside the app, so the ticket is born with source 'internal' —
   the one channel that means "an Opendhi person put this here" rather than a
   client reaching in. That is not a detail: it is what the Channel column and
   the panel's Conversation gate both read.

   TRIGGER MESSAGE is optional and is NOT the description. The description is
   what the agent understands the problem to be; the trigger message is what
   the client actually said. Keeping them apart is what lets the ticket be
   raised from a chat, an email forwarded to the desk, or a phone call, without
   the agent's paraphrase quietly replacing the client's words. When present it
   is written as the first log entry, attributed to the client — because that
   is what it is, an entry in the history, not a field on the record. */
let tkModalOpen=false;
let tkLinkedRecord=null;          // resolved by Search, cleared when the field changes
const TK_PRIORITIES=['Low','Medium','High','Urgent'];
/* ── The employee dashboard's "Need Help?" banner ─────────────────────────
   The button was markup only. It now opens the ticket form on the Tickets
   page, which is the one place this app actually takes support requests.

   THE FLAG IS SET BEFORE THE NAVIGATION, not after. openCreateTicket()
   repaints whatever page is current, and from the dashboard that is the
   dashboard — which does not render the ticket modal, so the form would never
   appear. Setting it first means the Tickets page draws with the form already
   open, in a single repaint. */
function raiseTicketFromHelp(fromDashboard){
  tkModalOpen=true;tkLinkedRecord=null;tkSelectedId=null;
  /* WHO IS ASKING DECIDES WHETHER THERE IS A WAY BACK. The dashboard banner
     sends the user off a page they were reading, so it earns the "Back to
     Dashboard" button; the profile menu can be opened from anywhere, and
     offering to return to a page they were never on is a lie. */
  navigatePage('support-tickets',!!fromDashboard);
}
function openCreateTicket(){tkModalOpen=true;tkLinkedRecord=null;renderADTPage();}
function closeCreateTicket(){tkModalOpen=false;tkLinkedRecord=null;renderADTPage();}

/* The Search button resolves a contract ID against real contracts instead of
   accepting whatever was typed. A linked record that does not exist is worse
   than none — it looks like provenance and is not. */
function tkSearchRecord(){
  const el=document.getElementById('tk-new-link');
  const q=el?el.value.trim():'';
  if(!q){tkLinkedRecord=null;tkRenderLinkResult();return;}
  const c=contractsData.find(function(x){return String(x.contractId)===q;});
  tkLinkedRecord=c?{id:c.contractId,label:c.empName+' · '+c.type+' · '+c.country}:null;
  if(!c)showToast('No contract found','error','Nothing matches contract ID '+q+'.');
  tkRenderLinkResult();
}
// Swapped on its own so typing in the modal never rebuilds the form under the
// user — the same reason pmSetUserSubTab() swaps only its sub-body.
function tkRenderLinkResult(){
  const box=document.getElementById('tk-link-result');if(!box)return;
  box.innerHTML=tkLinkResultHTML();
}
function tkLinkResultHTML(){
  if(!tkLinkedRecord)return '';
  const x='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  return '<div class="tk-link-chip"><b>'+tkLinkedRecord.id+'</b><span>'+tkLinkedRecord.label+'</span>'
    +'<button onclick="tkClearRecord()" title="Remove link">'+x+'</button></div>';
}
function tkClearRecord(){
  tkLinkedRecord=null;
  const el=document.getElementById('tk-new-link');if(el)el.value='';
  tkRenderLinkResult();
}

function buildCreateTicketModalHTML(){
  const xSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const clients=[...new Set(ticketsData.map(function(t){return t.clientName;}))].sort();
  const cats=[...new Set(ticketsData.map(function(t){return t.category;}))].sort();
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Create Ticket</span>'
      +'<button class="ct-modal-close" onclick="closeCreateTicket()">'+xSvg+'</button></div>'

    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Client <span class="req">*</span></label>'
      +customSelect('tk-new-client','',clients,'Select Client')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Due Date</label>'
      // The app's own picker, not <input type="date">: the native one draws the
      // browser's calendar, which ignores every token in this interface.
      +apCD('tk-new-due','','Select date')+'</div>'

    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Trigger Message '
      +'<span class="ep-optional">(optional)</span></label>'
      +'<textarea class="ep-form-input tk-ta" id="tk-new-trigger" placeholder="Paste or describe the client message that triggered this ticket"></textarea></div>'

    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Title <span class="req">*</span></label>'
      +'<input type="text" class="ep-form-input" id="tk-new-title" placeholder="Enter ticket title"></div>'

    +'<div class="ep-form-group"><label class="ep-form-label">Category <span class="req">*</span></label>'
      +customSelect('tk-new-cat','Compliance',cats,'Select Category')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Assign To</label>'
      +customSelect('tk-new-agent','',TK_AGENTS,'Select Team Member')+'</div>'

    // All four on screen, not a select: Urgent only means something next to Low.
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Priority</label>'
      +ciRadio('tk-new-prio',TK_PRIORITIES,'Medium')+'</div>'

    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Description</label>'
      +'<textarea class="ep-form-input tk-ta tk-ta-lg" id="tk-new-desc" placeholder="Describe the support issue"></textarea></div>'

    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Linked Record</label>'
      +'<div class="tk-link-row">'
      +'<input type="text" class="ep-form-input" id="tk-new-link" placeholder="Enter contract ID (e.g. 94135) and press Enter" '
        +'onkeydown="if(event.key===\'Enter\'){event.preventDefault();tkSearchRecord();}">'
      +'<button class="ep-cancel-btn" onclick="tkSearchRecord()">Search</button>'
      +'</div>'
      +'<div id="tk-link-result">'+tkLinkResultHTML()+'</div></div>'
    +'</div>'

    +'<div class="ep-form-card cmp-rules-card">'
    +'<div class="cs-toggle-row"><div><div class="cs-toggle-label">Notify client when ticket is created</div>'
      +'<div class="cmp-rule-hint">Sends email, Notification Centre update, and chat reply if a trigger chat exists</div></div>'
      +'<label class="cs-toggle"><input type="checkbox" id="tk-new-notify" checked><span class="cs-toggle-slider"></span></label></div>'
    +'</div>'

    +'<div style="display:flex;justify-content:flex-end;gap:10px">'
    +'<button class="ep-cancel-btn" onclick="closeCreateTicket()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="saveNewTicket()">Create Ticket</button>'
    +'</div>'
    +'</div></div>';
}

function saveNewTicket(){
  const client=getCustomSelectValue('tk-new-client');
  const titleEl=document.getElementById('tk-new-title');
  const title=titleEl?titleEl.value.trim():'';
  const cat=getCustomSelectValue('tk-new-cat');
  if(!client){showToast('Please select a Client','error');return;}
  if(!title){showToast('Please enter a Title','error');titleEl&&titleEl.focus();return;}
  if(!cat){showToast('Please select a Category','error');return;}

  const agent=getCustomSelectValue('tk-new-agent');
  const priority=ciPicked('tk-new-prio','Medium');
  const trigEl=document.getElementById('tk-new-trigger');
  const descEl=document.getElementById('tk-new-desc');
  const notifyEl=document.getElementById('tk-new-notify');
  const trigger=trigEl?trigEl.value.trim():'';
  const notify=notifyEl?notifyEl.checked:true;

  // Carry the client's known contact details forward rather than leaving the
  // panel with blanks the agent would have to go and find.
  const known=ticketsData.find(function(t){return t.clientName===client;})||{};
  const nextNum=ticketsData.reduce(function(m,t){
    const n=parseInt(String(t.ticketId).replace(/\D/g,''),10);
    return n>m?n:m;
  },2000)+1;
  const id=ticketsData.reduce(function(m,t){return t.id>m?t.id:m;},0)+1;
  const now=new Date();
  const created=now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const t={
    id:id,ticketId:'TCK-'+nextNum,clientName:client,title:title,category:cat,
    createdAt:created,status:agent?'in_progress':'open',
    // An unassigned ticket stays 'open' and shows on the Unassigned tile; one
    // raised with an owner is already being worked, so it starts in progress.
    source:'internal',raisedBy:CURRENT_USER,
    clientEmail:known.clientEmail||'',clientPhone:known.clientPhone||'',country:known.country||'',
    assignedTo:agent||'',priority:priority,dueDate:getCDValue('tk-new-due'),
    linkedRecord:tkLinkedRecord?tkLinkedRecord.id:'',notifyClient:notify,
    description:descEl&&descEl.value.trim()?descEl.value.trim():title
  };
  ticketsData.unshift(t);
  lpLanded('support-tickets',t.id);

  /* Seeded so the panel opens on a real history rather than "no logs yet". The
     trigger message is the CLIENT's entry and is stamped as such — it is the
     only line here they actually said. */
  const s=stampNow();
  const logs=[{date:s.date,time:s.time,user:CURRENT_USER,status:tkStatusLabel(t.status),
               action:'Ticket raised from the Tickets page'+(agent?' and assigned to '+agent:'')+'.'}];
  if(trigger)logs.push({date:s.date,time:s.time,user:client,status:'Open',action:trigger});
  tkLogsData[t.id]=logs;
  tkWorkflowData[t.id]=[{title:'Ticket Raised',user:CURRENT_USER,date:s.date,time:s.time,
    description:cat+' ticket raised for '+client+' ('+t.ticketId+')'
      +(tkLinkedRecord?', linked to contract '+tkLinkedRecord.id:'')+'.'}];

  tkModalOpen=false;tkLinkedRecord=null;
  tkSelectedId=null;
  renderADTPage();
  showToast('Ticket created','success',t.ticketId+' · '+title
    +(notify?' — client notified.':' — client not notified.'));
}
function buildTicketsPageHTML(){
  const dotsIco='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const scope=tkScope();
  const channels=Object.keys(TK_SOURCES).map(function(k){return TK_SOURCES[k].label;});
  const cnt=function(s){return scope.filter(function(t){return t.status===s;}).length;};
  const unassignedCount=scope.filter(tkIsUnassigned).length;
  const rows=tkRows();
  // A panel must belong to a row you can still see, so a filter that drops the
  // open ticket closes it rather than leaving a panel with no row behind it.
  if(tkSelectedId&&!rows.some(function(t){return t.id===tkSelectedId;}))tkSelectedId=null;
  const sig=tkQuickStatusFilter+'|'+tkChannelFilter+'|'+tkSearchQuery;
  /* Eight columns, each value paired with its qualifier in the shared .lp-c-*
     two-line cell rather than the qualifier taking a column of its own: the
     reference carries the channel, the client carries who raised it, the title
     carries the category. */
  const pgn=listPage('support-tickets',sig,lpSearchRows(rows,tkSearchQuery).map(function(t,i){
    const unassigned=tkIsUnassigned(t);
    // "via" only earns its line when somebody other than the client raised it —
    // repeating the name back under itself was pure noise on most rows.
    const raiser=(t.raisedBy&&t.raisedBy!==t.clientName)?t.raisedBy:'';
    return '<tr class="tk-row'+(tkSelectedId===t.id?' lp-row-selected':'')+'" id="tk-row-'+t.id+'" style="cursor:pointer" onclick="openTkSidebar('+t.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td class="lp-c-tight"><div class="lp-c-main">'+t.ticketId+'</div>'
        +'<div class="lp-c-sub"><span class="sr-channel'+(tkIsChat(t)?' is-chat':'')+'">'+tkSourceShort(t)+'</span></div></td>'
      +'<td class="lp-c-tight"><div class="lp-c-main">'+t.clientName+'</div>'
        +(raiser?'<div class="lp-c-sub">via '+raiser+'</div>':'')+'</td>'
      +'<td><span class="lp-c-clip" title="'+attrSafe(t.title)+'">'+t.title+'</span>'
        +'<div class="lp-c-sub">'+t.category+'</div></td>'
      // Created At is on the panel's Basic Details.
      +'<td>'+tkStatusBadge(t.status)+'</td>'
      // Unassigned is the state this queue is actually managed by, so it is
      // called out rather than left as an empty cell.
      +'<td class="lp-c-tight"><div class="lp-c-plain'+(unassigned?' is-urgent':'')+'" title="'+attrSafe(tkOwner(t))+'">'
        +(unassigned?'Unassigned':tkOwnerShort(t))+'</div></td>'
      +'<td onclick="event.stopPropagation()">'+rowLogCell('support-tickets',t.id)+'</td>'
      +'</tr>';
  }),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No tickets match this filter.</td></tr>');
  const sbInner=tkSelectedId?renderTkSidebar():'';
  const stat=function(key,count,label,colour){
    return '<div class="listing-stat'+(tkQuickStatusFilter===key?' stat-selected':'')+'"'
      +' onclick="tkToggleStatFilter(\''+key+'\')">'
      +'<div class="listing-stat-count" style="color:'+colour+'">'+count+'</div>'
      +'<div class="listing-stat-label">'+label+'</div></div>';
  };
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('tk-f-q',tkSearchQuery,'Search ticket','applyTkFilters()')
    +apCS('tk-f-channel',channels,tkChannelFilter,'All Channels')
    +apCS('tk-f-status',['open','in_progress','blocked','resolved','closed'],
        tkIsPseudoStatus(tkQuickStatusFilter)?'':tkQuickStatusFilter,'All Statuses')
    +clearFiltersBtn([tkQuickStatusFilter,tkChannelFilter,tkSearchQuery],'resetTkFilters()')
    +'<button class="lp-pill-search" onclick="applyTkFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats is-compact">'
    +stat('__unassigned__',unassignedCount,'Unassigned','var(--st-bad-fg)')
    +stat('open',cnt('open'),'Open','var(--st-info-fg)')
    +stat('in_progress',cnt('in_progress'),'In Progress','var(--st-wait-fg)')
    +stat('blocked',cnt('blocked'),'Blocked','var(--st-bad-fg)')
    +stat('resolved',cnt('resolved'),'Awaiting Client','var(--st-ok-fg)')
    +stat('__unresolved__',tkScope().filter(tkIsUnresolved).length,'Unresolved','var(--st-wait-fg)')
    +'</div></div>'
    +'<div class="lp-split-wrap" style="margin-top:14px"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table lp-table-2line sr-table"><thead><tr><th>S.No</th><th>Ticket ID</th><th>Client</th><th>Title</th><th>Status</th><th>Next Action On</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(tkSelectedId?' open':'')+'" id="tk-split-sb"><div class="lp-isb" id="tk-isb-inner">'+sbInner+'</div></div>'
    +'</div></div>'
    +(tkModalOpen?buildCreateTicketModalHTML():'');
}

/* ── CSM DASHBOARD KEY METRICS ────────────────────────────────────────────
   These four cards ask the Tickets listing's own question from the dashboard,
   so they are counted from ticketsData rather than carrying numbers of their
   own, and each one opens the exact filter it counted. A card that reads 4
   and lands on a list of 3 teaches people not to trust the cards.

   Built from data like the compliance dashboard's tiles - see the note in
   switchDashboard() for why that means re-rendering when the tab is shown. */
const CSM_METRICS=[
  {key:'blocked',       kind:'blocked',    label:'Blocked'},
  {key:'in_progress',   kind:'active',     label:'Active'},
  {key:'open',          kind:'pending',    label:'Pending'},
  {key:'__unresolved__',kind:'unresolved', label:'Unresolved'}
];
const CSM_METRIC_ICON={
  blocked:'<circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17.01"/>',
  active:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  pending:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  unresolved:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a3 3 0 0 1 5 2.2c0 2-2.5 2.3-2.5 4.1"/><line x1="12" y1="18" x2="12" y2="18.01"/>'
};
function csmMetricCount(key){
  if(typeof ticketsData==='undefined')return 0;
  return key==='__unresolved__'
    ? ticketsData.filter(tkIsUnresolved).length
    : ticketsData.filter(function(t){return t.status===key;}).length;
}
function buildCsmMetricsHTML(){
  return CSM_METRICS.map(function(m){
    var n=csmMetricCount(m.key);
    return '<div class="csm-status-card" role="button" tabindex="0"'
      +' onclick="tkGoStatus(\''+m.key+'\')"'
      // Enter/Space because a div given a button's job has to do a button's job
      +' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();tkGoStatus(\''+m.key+'\');}"'
      +' title="View '+m.label.toLowerCase()+' tickets">'
      +'<div class="csm-status-icon '+m.kind+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor">'+CSM_METRIC_ICON[m.kind]+'</svg></div>'
      +'<div class="csm-status-value">'+n+'</div>'
      +'<div class="csm-status-label">'+m.label+'</div>'
      +'</div>';
  }).join('');
}
function renderCsmDashCards(){
  const el=document.getElementById('csm-status-grid');
  if(!el)return;
  el.innerHTML=buildCsmMetricsHTML();
}

// ── CHATS PAGE ──
function renderChatSidebar(){
  const c=chatsData.find(x=>x.id===chatSelectedId);if(!c)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'tickets',label:'Tickets'},{id:'attachments',label:'Attachments'},{id:'assignment',label:'Assignment'},{id:'workflow',label:'Workflow'}];
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'chat-isb-tabs\')" title="Scroll left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>'
    +'<div class="lp-isb-tabs" id="chat-isb-tabs">'+tabs.map(tb=>'<button class="lp-isb-tab'+(chatTab===tb.id?' active':'')+'" onclick="navChatTab(\''+tb.id+'\')">'+tb.label+'</button>').join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'chat-isb-tabs\')" title="Scroll right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeChatSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  const iUser='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const iMail='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  const iGlobe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const iTag='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const iCal='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const iClock='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  const iTicket='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3z"/></svg>';
  const fc=(icon,label,value)=>'<div class="lp-sb-field-card"><div class="lp-sb-field-icon">'+icon+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+(value!=null?value:'<span style="color:#9ca3af">-</span>')+'</div></div></div>';
  const thS='padding:8px 10px;text-align:left;font-size:10.5px;font-weight:600;color:#6b7280;background:#f8fafc;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.4px';
  let body='';
  if(chatTab==='basic-details'){
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Client Information</span></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'
      +fc(iUser,'Client Name',c.clientName)+fc(iMail,'Email',c.clientEmail)
      +fc(iGlobe,'Country',c.country)+fc(iTag,'Status',sbStatus(c.status,chatStatusLabel(c.status)))
      +'</div>'
      +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Chat Information</span></div>'
      +'<div class="lp-sb-detail-grid">'
      +fc(iTag,'Chat ID',c.chatId)+fc(iUser,'Assigned To',c.assignedTo)
      +fc(iCal,'Started At',c.startedAt)+fc(iClock,'Last Activity',c.lastActivity)
      +'</div>';
  }else if(chatTab==='tickets'){
    const linked=c.linkedTickets.map(tid=>ticketsData.find(t=>t.ticketId===tid)).filter(Boolean);
    if(linked.length===0){
      body='<div style="padding:40px;text-align:center;color:#9ca3af"><div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:6px">No linked tickets.</div><div style="font-size:12px">Tickets linked to this chat will appear here.</div></div>';
    }else{
      body='<div style="display:flex;flex-direction:column;gap:10px">'
        +linked.map(t=>'<div style="border:1.5px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px"><div style="color:#6b7280;margin-top:1px">'+iTicket+'</div><div style="flex:1"><div style="font-weight:700;color:var(--navy);font-size:13px;margin-bottom:2px">'+t.ticketId+'</div><div style="font-size:12px;color:#64748b;margin-bottom:6px">'+t.title+'</div><div style="display:flex;gap:8px;align-items:center">'+tkStatusBadge(t.status)+'<span style="font-size:11px;color:#9ca3af">'+t.category+' · '+t.createdAt+'</span></div></div></div>').join('')
        +'</div>';
    }
  }else if(chatTab==='attachments'){
    body=attachTabHTML('chat',chatSelectedId);
  }else if(chatTab==='assignment'){
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Current Assignment</span></div>'
      +'<div class="lp-sb-detail-grid" style="margin-bottom:20px">'
      +fc(iUser,'Assigned To',c.assignedTo)+fc(iCal,'Since',c.startedAt)
      +'</div>'
      +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Reassign Chat</span></div>'
      +'<div style="display:flex;flex-direction:column;gap:10px">'
      +'<div><div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:5px">Select Agent</div>'
      +'<select style="width:100%;height:38px;border:1.5px solid var(--border);border-radius:8px;padding:0 12px;font-size:13px;font-family:inherit;outline:none;color:var(--navy);background:#fff"><option value="">Choose assignee…</option><option>Pallavi Parate</option><option>Rahul Mehta</option><option>Aman Singh</option><option>Neha Sharma</option><option>Olivia Clark</option></select></div>'
      +'<button style="align-self:flex-start;height:34px;padding:0 20px;background:var(--orange);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Reassign</button>'
      +'</div>';
  }else if(chatTab==='history'){
    body=sbHistoryHTML(c);
  }else if(chatTab==='logs'){
    /* The same two-column Logs tab every other module has: history on the left,
       the move that writes the next entry on the right. It was a read-only
       timeline of two hard-coded lines, which is why nothing here could be
       acted on. */
    const logs=chatSeedLogs(c);
    /* WHO OWES THE NEXT MESSAGE is the whole question a chat queue asks, so it
       is stated above the form rather than left to be inferred from a status
       word. The options are only the moves legal from where the chat is. */
    const moves=chatMoves(c);
    const form='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+statusTone(chatStatusLabel(c.status))+'"></span>'+chatStatusLabel(c.status)+'</div>'
      +'<p class="lp-logs-form-sub">Next action on <strong>'+chatOwner(c)+'</strong></p>'
      +'<div class="lp-logs-form-label">Move to <span class="lp-logs-form-req">*</span></div>'
      +apCS('chat-log-status-sel',moves.map(chatMoveLabel),'','Select the next step')
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="chat-log-comment-inp" placeholder="Pick a step above, then say what happened"></textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="ep-cancel-btn" style="flex:1" onclick="chatCancelLog()">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="chatSaveLog('+c.id+')">Submit</button>'
      +'</div></div>';
    body=lpLogsView(logs,form,{owner:chatOwner(c)});
  }else if(chatTab==='workflow'){
    body=wfTimelineHTML(wfChat(c));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}

function chatToggleStatFilter(v){
  chatQuickStatusFilter=chatQuickStatusFilter===v?'':v;
  chatSelectedId=null;
  renderADTPage();
}
function applyChatFilters(){
  const status=getCSValue('chat-f-status');
  chatQuickStatusFilter=status&&status!=='All Statuses'?status:'';
  chatSearchQuery=lpSearchValue('chat-f-q');
  chatSelectedId=null;
  renderADTPage();
}
function resetChatFilters(){
  chatQuickStatusFilter='';chatSearchQuery='';
  chatSelectedId=null;
  renderADTPage();
}
function buildChatsPageHTML(){
  const dotsIco='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const assignees=[...new Set(chatsData.map(c=>c.assignedTo))];
  const countries=[...new Set(chatsData.map(c=>c.country))];
  const activeCount=chatsData.filter(c=>c.status==='active').length;
  const waitingCount=chatsData.filter(c=>c.status==='waiting_client'||c.status==='waiting_csm').length;
  const inactiveCount=chatsData.filter(c=>c.status==='inactive').length;
  const filteredChats=chatQuickStatusFilter?(chatQuickStatusFilter==='__waiting_group__'?chatsData.filter(c=>c.status==='waiting_client'||c.status==='waiting_csm'):chatsData.filter(c=>c.status===chatQuickStatusFilter)):chatsData;
  const pgn=listPage('chats',chatQuickStatusFilter+'|'+chatSearchQuery,lpSearchRows(filteredChats,chatSearchQuery).map((c,i)=>(
    '<tr class="chat-row'+(chatSelectedId===c.id?' lp-row-selected':'')+'" id="chat-row-'+c.id+'" style="cursor:pointer" onclick="openChatSidebar('+c.id+')">'
    +'<td style="color:#6b7280;font-size:13px">'+(i+1)+'</td>'
    +'<td style="font-weight:600;color:var(--navy)">'+c.chatId+'</td>'
    +'<td style="font-weight:600;color:var(--navy)">'+c.clientName+'</td>'
    +'<td style="color:#64748b;font-size:13px">'+c.assignedTo+'</td>'
    +'<td style="font-size:12px;color:#64748b">'+c.lastActivity+'</td>'
    +'<td>'+chatStatusBadge(c.status)+'</td>'
    +'<td onclick="event.stopPropagation()">'+rowLogCell('chats',c.id)+'</td>'
    +'</tr>'
  )),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No chats match this filter.</td></tr>');
  const sbInner=chatSelectedId?renderChatSidebar():'';
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('chat-f-q',chatSearchQuery,'Search chat','applyChatFilters()')
    +apCS('chat-f-country',countries,'','All Countries')
    +apCS('chat-f-assignee',assignees,'','All Assignees')
    +apCS('chat-f-status',['active','waiting_client','waiting_csm','inactive'],chatQuickStatusFilter==='__waiting_group__'?'':chatQuickStatusFilter,'All Statuses')
    +clearFiltersBtn([chatQuickStatusFilter,chatSearchQuery],'resetChatFilters()')
    +'<button class="lp-pill-search" onclick="applyChatFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'
    +'<div class="listing-stat'+(chatQuickStatusFilter==='active'?' stat-selected':'')+'" onclick="chatToggleStatFilter(\'active\')"><div class="listing-stat-count" style="color:var(--st-ok-fg)">'+activeCount+'</div><div class="listing-stat-label">Active</div></div>'
    +'<div class="listing-stat'+(chatQuickStatusFilter==='__waiting_group__'?' stat-selected':'')+'" onclick="chatToggleStatFilter(\'__waiting_group__\')"><div class="listing-stat-count" style="color:var(--st-wait-fg)">'+waitingCount+'</div><div class="listing-stat-label">Waiting</div></div>'
    +'<div class="listing-stat'+(chatQuickStatusFilter==='inactive'?' stat-selected':'')+'" onclick="chatToggleStatFilter(\'inactive\')"><div class="listing-stat-count" style="color:var(--st-bad-fg)">'+inactiveCount+'</div><div class="listing-stat-label">Inactive</div></div>'
    +'</div></div>'
    +'<div class="lp-split-wrap" style="margin-top:14px"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table"><thead><tr><th>S.No</th><th>Chat ID</th><th>Client Name</th><th>Assigned To</th><th>Last Activity</th><th>Status</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(chatSelectedId?' open':'')+'" id="chat-split-sb"><div class="lp-isb" id="chat-isb-inner">'+sbInner+'</div></div>'
    +'</div></div>';
}

// -- AI EXECUTIVE MODULE --
const aiChipClassMap={'AI Automated':'ai-chip-ai','Human Required':'ai-chip-human','System Action':'ai-chip-system','Client Action':'ai-chip-client','Validation Required':'ai-chip-validation','Approval Required':'ai-chip-approval','Exception Possible':'ai-chip-exception'};
function aiChipClass(label){return aiChipClassMap[label]||'ai-chip-system';}
function aiChips(list){return (list||[]).map(l=>'<span class="ai-chip '+aiChipClass(l)+'">'+l+'</span>').join('');}
function aiPrimaryChipLabel(chips){
  if(!chips||!chips.length)return 'System Action';
  if(chips.includes('AI Automated'))return 'AI Automated';
  if(chips.includes('Human Required'))return 'Human Required';
  if(chips.includes('Approval Required'))return 'Approval Required';
  if(chips.includes('Client Action'))return 'Client Action';
  return chips[0];
}
function aiChipsCompact(chips){
  const primary=aiPrimaryChipLabel(chips);
  const extra=(chips||[]).length-1;
  return '<span class="ai-chip '+aiChipClass(primary)+'">'+primary+'</span>'+(extra>0?'<span class="ai-chip-more">+'+extra+'</span>':'');
}
function aiDrawerRow(label,val){return '<div class="review-row"><div class="rr-label">'+label+'</div><div class="rr-val" style="white-space:normal;font-weight:600">'+val+'</div></div>';}

function viewAIJourney(id){selectedAIJourneyId=id;aiEventDrawerIdx=-1;aiJourneyDetailSelectedStage=-1;navigatePage('ai-journey-detail');}
function startAutomateJourney(id){aiAutomateSkipPicker=true;aiAutomateResumeOrStart(id);navigatePage('ai-automate-form');}
function startAutomateJourneyPicker(){selectedAIJourneyId=null;aiAutomateSkipPicker=false;aiAutomateStep=0;aiAutomateFormData={};navigatePage('ai-automate-form');}

function buildAIExecutiveDashboardHTML(){
  const cards=aiJourneys.map(j=>{
    const isActive=j.status==='Active';
    const cta=isActive?aiJourneyCTA(j):null;
    return '<div class="ai-journey-card ai-journey-card-lg'+(isActive?' ai-journey-card-active':'')+'" onclick="viewAIJourney(\''+j.id+'\')">'
      +(isActive?'<div class="ai-journey-active-badge"><span class="ai-journey-active-dot"></span>Activated</div>':'')
      +'<div class="ai-journey-card-top">'
      +'<div class="ai-journey-name">'+j.name+'</div>'
      +'</div>'
      +'<div class="ai-journey-desc">'+j.desc+'</div>'
      +(j.status==='Draft'
        ?'<div class="ai-journey-draft-banner" onclick="event.stopPropagation();startAutomateJourney(\''+j.id+'\')"><span class="ai-journey-draft-banner-text">Draft pending</span><span class="ai-journey-draft-banner-cta">Continue now to automate your journey &rarr;</span></div>'
        :'')
      +(cta?'<button class="btn btn-primary ai-journey-cta-btn" onclick="event.stopPropagation();'+cta.action+'">'+cta.label+'</button>':'')
      +'</div>';
  }).join('');
  return '<div class="ai-exec-page">'
    +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px">'
    +'<div><p style="font-size:14px;font-weight:600;margin-bottom:4px">AI Executive</p><p style="font-size:12px;color:var(--gray);margin:0;max-width:640px">Automate ADT business journeys with governed AI assistance, approvals, and audit tracking.</p></div>'
    +'<button class="btn btn-primary btn-sm" style="flex-shrink:0" onclick="startAutomateJourneyPicker()">+ Create Your Journey</button>'
    +'</div>'
    +'<div class="ai-journey-grid ai-journey-grid-lg">'+cards+'</div>'
    +'</div>';
}

function buildAIResponsibilitySplitHTML(journeyId){
  const events=aiJourneyEvents[journeyId]||[];
  const aiEvents=events.filter(function(e){return e.chips.includes('AI Automated');});
  const humanEvents=events.filter(function(e){return e.chips.includes('Human Required')||e.chips.includes('Approval Required')||e.chips.includes('Client Action');});
  const item=function(e,cls){return '<div class="ai-resp-item"><span class="ai-resp-dot '+cls+'"></span>'+e.name+'</div>';};
  return '<div class="ai-resp-split">'
    +'<div class="ep-form-card ai-resp-card ai-resp-ai">'
    +'<div class="ep-form-title" style="border:none;margin-bottom:12px;padding-bottom:0">AI Will Handle <span class="ai-resp-count">'+aiEvents.length+' of '+events.length+' events</span></div>'
    +aiEvents.map(function(e){return item(e,'ai');}).join('')
    +'</div>'
    +'<div class="ep-form-card ai-resp-card ai-resp-human">'
    +'<div class="ep-form-title" style="border:none;margin-bottom:12px;padding-bottom:0">Human Will Handle <span class="ai-resp-count">'+humanEvents.length+' of '+events.length+' events</span></div>'
    +humanEvents.map(function(e){return item(e,'human');}).join('')
    +'</div>'
    +'</div>';
}
function aiTimelineDotClass(chips){
  if(chips.includes('AI Automated'))return 'ai';
  if(chips.includes('Human Required'))return 'human';
  if(chips.includes('Client Action'))return 'client';
  return 'system';
}

function buildAIJourneyDetailHTML(){
  const j=aiJourneys.find(x=>x.id===selectedAIJourneyId)||aiJourneys[0];
  const events=aiJourneyEvents[j.id]||[];
  const total=j.humanSteps+j.aiSteps;
  const timeline=events.map((e,i)=>{
    return '<div class="ai-timeline-item">'
      +'<div class="ai-timeline-dot '+aiTimelineDotClass(e.chips)+'">'+(i+1)+'</div>'
      +'<div class="ai-timeline-card" onclick="openAIEventDrawer(\''+j.id+'\','+i+')">'
      +'<div class="ai-timeline-card-head"><span class="ai-timeline-card-title">'+e.name+'</span></div>'
      +'<div class="ai-timeline-card-desc">'+e.desc+'</div>'
      +'<div class="ai-timeline-chips">'+aiChipsCompact(e.chips)+'</div>'
      +'</div></div>';
  }).join('');
  const statusActionHTML=j.status==='Active'
    ?'<button class="btn btn-primary btn-sm" onclick="viewAIActiveAutomation(\''+j.id+'\')">View Active Automation</button>'
    :j.status==='Draft'
      ?'<div class="ai-draft-pending"><span class="ai-draft-pending-text"><span class="ai-draft-pending-dot"></span>Draft pending &mdash; automation setup isn\'t finished yet.</span><button class="btn btn-primary btn-sm" onclick="startAutomateJourney(\''+j.id+'\')">Continue Automating Journey</button></div>'
      :'<button class="btn btn-primary btn-sm" onclick="startAutomateJourney(\''+j.id+'\')">Automate This Journey</button>';
  const mainContent='<button class="ep-cancel-btn" style="margin-bottom:18px" onclick="navigatePage(\'ai-executive\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg> All Journeys</button>'
    +'<div style="margin-bottom:28px"><p style="font-size:17px;font-weight:700;margin-bottom:6px">'+j.name+'</p><p style="font-size:12.5px;color:var(--gray);margin:0;max-width:680px;line-height:1.6">'+j.desc+'</p></div>'
    +'<div class="stat-grid" style="margin-bottom:28px">'
    +'<div class="stat-card"><div class="stat-label"><span>Total Events</span></div><div class="stat-val">'+total+'</div></div>'
    +'<div class="stat-card"><div class="stat-label"><span>AI Automated</span></div><div class="stat-val" style="color:var(--orange)">'+j.aiSteps+'</div></div>'
    +'<div class="stat-card"><div class="stat-label"><span>Human Required</span></div><div class="stat-val" style="color:#2563eb">'+j.humanSteps+'</div></div>'
    +'<div class="stat-card"><div class="stat-label"><span>Risk Level</span></div><div class="stat-val" style="font-size:16px">'+j.risk+'</div></div>'
    +'</div>'
    +'<div class="ep-form-card" style="margin-bottom:28px;padding:20px 22px">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">'
    +'<div style="font-size:12px;color:var(--gray);line-height:1.8">Connected Modules: <strong style="color:var(--navy);font-weight:600">'+j.modules.join(', ')+'</strong><br>Status: <strong style="color:var(--navy);font-weight:600">'+j.status+'</strong> &middot; Last Updated: '+j.updated+'</div>'
    +(j.status==='Draft'?'':statusActionHTML)
    +'</div>'
    +(j.status==='Draft'?'<div style="margin-top:16px">'+statusActionHTML+'</div>':'')
    +'</div>'
    +buildAIJourneyRunSummaryHTML(j.id)
    +'<div class="review-title" style="margin-bottom:14px">Responsibility Split</div>'
    +buildAIResponsibilitySplitHTML(j.id)
    +'<div class="review-title" style="margin:32px 0 14px">Journey Timeline</div>'
    +'<div class="ai-timeline">'+timeline+'</div>';
  return '<div class="ai-exec-page ai-journey-detail-page">'+mainContent+'</div>';
}

function aiJourneyRunStageCounts(journeyId){
  const events=aiJourneyEvents[journeyId]||[];
  const runs=aiAutomationRuns[journeyId]||[];
  return events.map(function(e,i){
    const atStage=runs.filter(function(r){return r.status!=='Completed'&&r.currentStepIdx===i;});
    const exceptions=atStage.filter(function(r){return r.status==='Exception';}).length;
    return {total:atStage.length,exceptions:exceptions};
  });
}
function buildAIJourneyRunSummaryHTML(journeyId){
  const runs=aiAutomationRuns[journeyId]||[];
  const events=aiJourneyEvents[journeyId]||[];
  const completed=runs.filter(function(r){return r.status==='Completed';}).length;
  const exceptions=runs.filter(function(r){return r.status==='Exception';}).length;
  const inProgress=runs.length-completed-exceptions;
  const stageCounts=aiJourneyRunStageCounts(journeyId);
  const bar='<div class="aicj-bar" style="margin-bottom:0">'+events.map(function(e,i){
    const c=stageCounts[i];
    const hasBadge=c.total>0;
    const badgeCls=c.exceptions>0?'exception':'pending';
    const badge=hasBadge?'<div class="aicj-stage-badge '+badgeCls+'">'+c.total+'</div>':'';
    let html='<div class="aicj-step">'
      +'<div class="aicj-dot-wrap'+(hasBadge?' clickable':'')+'"'+(hasBadge?' onclick="aiJourneyDetailSelectStage('+i+')"':'')+'>'
      +'<div class="aicj-dot pending"></div>'
      +badge
      +'</div>'
      +'<div class="aicj-step-label">'+aiCjShortLabel(e.name)+'</div>'
      +'</div>';
    if(i<events.length-1){
      html+='<div class="aicj-line"><div class="aicj-line-fill"></div></div>';
    }
    return html;
  }).join('')+'</div>';
  return '<div class="review-title" style="margin-bottom:14px">Journey Runs</div>'
    +'<div class="stat-grid" style="margin-bottom:20px">'
    +'<div class="stat-card"><div class="stat-label"><span>Journeys Created</span></div><div class="stat-val">'+runs.length+'</div></div>'
    +'<div class="stat-card"><div class="stat-label"><span>Completed</span></div><div class="stat-val" style="color:#16a34a">'+completed+'</div></div>'
    +'<div class="stat-card"><div class="stat-label"><span>In Progress</span></div><div class="stat-val" style="color:#2563eb">'+inProgress+'</div></div>'
    +'<div class="stat-card"><div class="stat-label"><span>Needs Attention</span></div><div class="stat-val" style="color:'+(exceptions?'#b83a3a':'var(--navy)')+'">'+exceptions+'</div></div>'
    +'</div>'
    +'<div class="ep-form-card" style="margin-bottom:16px;padding:18px 22px 20px">'+bar+'</div>'
    +'<div id="aicj-run-drilldown">'+buildAIJourneyRunDrilldownHTML()+'</div>';
}
function buildAIJourneyRunDrilldownHTML(){
  const j=aiJourneys.find(x=>x.id===selectedAIJourneyId)||aiJourneys[0];
  const events=aiJourneyEvents[j.id]||[];
  const idx=aiJourneyDetailSelectedStage;
  if(idx<0)return '<div style="font-size:12px;color:var(--gray);padding:4px 2px">Click a stage above to see what\'s pending there.</div>';
  const runs=(aiAutomationRuns[j.id]||[]).filter(function(r){return r.status!=='Completed'&&r.currentStepIdx===idx;});
  const stageName=(events[idx]||{}).name||'';
  const rows=runs.map(function(r){
    return '<tr style="cursor:pointer" onclick="viewAIRun(\''+r.runId+'\')">'
      +'<td><div class="cell-primary">'+r.client+'</div><div class="cell-sub">'+r.runId+'</div></td>'
      +'<td><div class="cell-primary">'+r.country+'</div><div class="cell-sub">'+r.contractType+'</div></td>'
      +'<td><span class="status-pill '+aiRunStatusPillClass(r.status)+'">'+r.status+'</span></td>'
      +'<td class="cell-sub">'+r.lastActivity+'</td>'
      +'<td onclick="event.stopPropagation()"><button class="btn btn-secondary btn-sm" onclick="viewAIRun(\''+r.runId+'\')">View Run</button></td>'
      +'</tr>';
  }).join('');
  return '<div style="font-size:12.5px;font-weight:700;color:var(--navy);margin-bottom:10px">Pending at &ldquo;'+stageName+'&rdquo; &middot; '+runs.length+' '+(runs.length===1?'journey':'journeys')+'</div>'
    +'<div class="listing-card">'
    +'<table class="listing-table ai-run-table"><thead><tr>'
    +'<th>Client</th><th>Country &amp; Type</th><th>Status</th><th>Last Activity</th><th>Action</th>'
    +'</tr></thead><tbody>'+(rows||'<tr><td colspan="5" style="text-align:center;color:var(--gray);padding:20px">No journeys currently at this stage.</td></tr>')+'</tbody></table>'
    +'</div>';
}
function aiJourneyDetailSelectStage(idx){
  aiJourneyDetailSelectedStage=aiJourneyDetailSelectedStage===idx?-1:idx;
  const el=document.getElementById('aicj-run-drilldown');
  if(el)el.innerHTML=buildAIJourneyRunDrilldownHTML();
}

function openAIEventDrawer(journeyId,idx){
  selectedAIJourneyId=journeyId;aiEventDrawerIdx=idx;
  const overlay=document.getElementById('ct-modal-overlay');if(!overlay)return;
  overlay.innerHTML=renderAIEventDrawer();
  overlay.style.display='flex';
}
function closeAIEventDrawer(){
  aiEventDrawerIdx=-1;
  const overlay=document.getElementById('ct-modal-overlay');if(overlay){overlay.style.display='none';overlay.innerHTML='';}
}
function renderAIEventDrawer(){
  const j=aiJourneys.find(x=>x.id===selectedAIJourneyId);if(!j)return '';
  const e=(aiJourneyEvents[j.id]||[])[aiEventDrawerIdx];if(!e)return '';
  const header='<div class="ct-modal-hdr"><span class="ct-modal-title">'+e.name+'</span><button class="ct-modal-close" onclick="closeAIEventDrawer()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
  const fieldsRow=e.fields&&e.fields.length?aiDrawerRow('Fields AI will fetch',e.fields.join(', ')):'';
  const body='<div style="margin-bottom:16px">'+aiChips(e.chips)+'</div>'
    +'<div class="review-section"><div class="review-title">Event Description</div><p style="font-size:12.5px;color:var(--navy);line-height:1.6">'+e.desc+'</p></div>'
    +'<div class="review-section"><div class="review-title">Automation Details</div><div class="review-grid" style="grid-template-columns:1fr">'
    +aiDrawerRow('Data Source',e.source)
    +fieldsRow
    +aiDrawerRow('Validation Rules',e.validation)
    +aiDrawerRow('Human intervention required when',e.human)
    +aiDrawerRow('Failure Condition',e.failure)
    +aiDrawerRow('Next Step',e.next)
    +aiDrawerRow('Audit Requirement','Every AI action on this event is logged with timestamp, data source, and outcome for compliance audit.')
    +'</div></div>';
  return '<div class="ct-modal" style="width:min(600px,92vw)" onclick="event.stopPropagation()">'+header+body+'</div>';
}

// ===================== CONFIGURE =====================
// Full parity with the reference OpenDHI configuration console: Overview,
// Systems (list + detail w/ APIs), Data models (list + detail w/ mapping,
// enrichment, rules, test), Context & Journey (list + detail w/ flow +
// agent/governance assignment drawer), Agents. Self-contained — reads
// nothing from the AI Executive module and touches no other page.

function cfgKVRow(label,val){return '<div class="review-row"><div class="rr-label">'+label+'</div><div class="rr-val" style="white-space:normal;font-weight:600">'+val+'</div></div>';}
function cfgPageHead(title,sub){return '<div style="margin-bottom:20px"><p style="font-size:14px;font-weight:600;margin-bottom:4px">'+title+'</p><p style="font-size:12px;color:var(--gray);margin:0;max-width:680px">'+sub+'</p></div>';}
function cfgBackBtn(pg,label){return '<button class="ep-cancel-btn" style="margin-bottom:18px" onclick="navigatePage(\''+pg+'\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg> '+label+'</button>';}

// -- Configure: Overview --
function buildCfgOverviewHTML(){
  const tiles=[
    ['cfg-systems','Systems',cfgSystems.length],
    ['cfg-data-foundation','Data models',cfgModels.length],
    ['cfg-context-journey','Journeys',cfgJourneys.length],
    ['cfg-agents','AI agents',cfgAgents.length]
  ].map(function(t){
    return '<div class="stat-card" style="cursor:pointer" onclick="navigatePage(\''+t[0]+'\')"><div class="stat-label"><span>'+t[1]+'</span></div><div class="stat-val">'+t[2]+'</div></div>';
  }).join('');
  const activity=cfgRecentActivity.map(function(a){
    return '<div class="tr" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;border-bottom:1px solid var(--border)">'
      +'<div><div style="font-size:13.5px;font-weight:500;color:var(--navy)">'+a.title+'</div><div style="font-size:12px;color:var(--gray);margin-top:3px">'+a.sub+'</div></div>'
      +'<div style="font-family:monospace;font-size:11.5px;color:var(--gray);white-space:nowrap">'+a.when+'</div>'
      +'</div>';
  }).join('');
  return '<div class="ai-exec-page">'
    +cfgPageHead('Overview','Configuration for the sandbox — connect systems, define data models, wire journeys, and manage agents.')
    +'<div class="stat-grid" style="margin-bottom:20px">'+tiles+'</div>'
    +'<div class="review-section" style="display:flex;align-items:center;gap:16px;border-color:#86efac;background:#f0fdf4;margin-bottom:24px">'
    +'<div style="font-family:var(--display,inherit);font-weight:800;font-size:38px;color:#16a34a;line-height:1;flex-shrink:0">0</div>'
    +'<div><div style="font-size:13px;font-weight:700;color:#15803d">Business records stored</div><div style="font-size:12px;color:#166534;margin-top:4px;line-height:1.6">Configure holds no customer data. Records are fetched on demand through APIs, used, and released — only configuration and audit logs are kept.</div></div>'
    +'</div>'
    +'<div class="review-title" style="margin-bottom:12px">Recent activity</div>'
    +'<div class="ep-form-card" style="padding:0">'+activity+'</div>'
    +'</div>';
}

// -- Configure: Systems (list + detail, fully configurable) --
function cfgSlug(str){
  const base=String(str).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'system';
  let id=base,n=1;
  while(cfgSystems.some(function(s){return s.id===id;})){n++;id=base+'-'+n;}
  return id;
}
function viewCfgSystem(id){selectedCfgSystemId=id;cfgSystemEditing=false;cfgSystemDraft=null;navigatePage('cfg-system-detail');}
function buildCfgSystemsHTML(){
  cfgSystemEditing=false;cfgSystemDraft=null;
  const total=cfgSystems.length;
  const connected=cfgSystems.filter(function(s){return s.status==='Connected';}).length;
  const allOk=total>0&&connected===total;
  const rows=cfgSystems.length
    ?cfgSystems.map(function(s){
      return '<div class="ep-form-card" style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:10px;padding:16px 20px;cursor:pointer" onclick="viewCfgSystem(\''+s.id+'\')">'
        +'<div><div style="font-size:13.5px;font-weight:700;color:var(--navy)">'+s.name+'</div><div style="font-size:11.5px;color:var(--gray);margin-top:3px">'+s.type+' &middot; '+s.method+'</div></div>'
        +'<span class="status-pill '+(s.status==='Connected'?'active':'inactive')+'">'+s.status+'</span>'
        +'</div>';
    }).join('')
    :'<div class="ep-form-card" style="text-align:center;color:var(--gray);font-size:12.5px;padding:32px">No systems yet — add your first one.</div>';
  const banner=allOk
    ?'<div class="review-section" style="display:flex;align-items:center;gap:12px;border-color:#86efac;background:#f0fdf4;margin-bottom:20px">'
      +'<div style="width:34px;height:34px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>'
      +'<div><div style="font-size:13px;font-weight:700;color:#15803d">All systems configured</div><div style="font-size:12px;color:#166534;margin-top:2px">Every system below is connected and ready to use in Data Foundation and Context &amp; Journey.</div></div>'
      +'</div>'
    :'<div class="review-section" style="display:flex;align-items:center;gap:12px;border-color:#fed7aa;background:#fff7ed;margin-bottom:20px">'
      +'<div style="width:34px;height:34px;border-radius:50%;background:#ffedd5;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17.02" x2="12.01" y2="17.02"/></svg></div>'
      +'<div><div style="font-size:13px;font-weight:700;color:#c2410c">'+connected+' of '+total+' systems connected</div><div style="font-size:12px;color:#9a3412;margin-top:2px">Test or configure the rest to bring them online.</div></div>'
      +'</div>';
  return '<div class="ai-exec-page">'
    +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:20px;flex-wrap:wrap">'
    +'<div><p style="font-size:14px;font-weight:600;margin-bottom:4px">Systems</p><p style="font-size:12px;color:var(--gray);margin:0;max-width:600px">The sources ADT connects to — each exposes its own API. Click a system for connection details.</p></div>'
    +'<button class="btn btn-primary btn-sm" style="flex-shrink:0" onclick="navigatePage(\'cfg-system-add\')">+ Custom System</button>'
    +'</div>'
    +banner
    +rows
    +'</div>';
}
function cfgApiDirBadge(dir){
  return dir==='rw'
    ?'<span class="badge" style="background:#f1f5f9;color:var(--navy)">read + write</span>'
    :'<span class="badge" style="background:#eff6ff;color:#2563eb">read</span>';
}
function startCfgSystemEdit(){cfgSystemEditing=true;cfgSystemDraft=null;navigatePage('cfg-system-detail');}
function cancelCfgSystemEdit(){cfgSystemEditing=false;cfgSystemDraft=null;navigatePage('cfg-system-detail');}
function captureCfgSystemDraft(){
  const g=function(id){const el=document.getElementById(id);return el?el.value:'';};
  cfgSystemDraft={name:g('cfg-sys-edit-name'),type:g('cfg-sys-edit-type'),method:g('cfg-sys-edit-method'),endpoint:g('cfg-sys-edit-endpoint'),auth:g('cfg-sys-edit-auth'),apis:g('cfg-sys-edit-apis'),status:g('cfg-sys-edit-status')};
}
function saveCfgSystemEdit(systemId){
  const s=cfgSystems.find(function(x){return x.id===systemId;});if(!s)return;
  const name=document.getElementById('cfg-sys-edit-name');
  if(!name||!name.value.trim()){showToast('Please enter a system name','error');name&&name.focus();return;}
  s.name=name.value.trim();
  const type=document.getElementById('cfg-sys-edit-type');if(type)s.type=type.value.trim()||s.type;
  const method=document.getElementById('cfg-sys-edit-method');if(method)s.method=method.value.trim()||s.method;
  const endpoint=document.getElementById('cfg-sys-edit-endpoint');if(endpoint)s.endpoint=endpoint.value.trim()||s.endpoint;
  const auth=document.getElementById('cfg-sys-edit-auth');if(auth)s.auth=auth.value.trim()||s.auth;
  const apis=document.getElementById('cfg-sys-edit-apis');if(apis&&apis.value!=='')s.apis=Math.max(0,parseInt(apis.value,10)||0);
  const status=document.getElementById('cfg-sys-edit-status');if(status)s.status=status.value;
  s.lastTestResult=null;
  cfgSystemEditing=false;cfgSystemDraft=null;
  navigatePage('cfg-system-detail');
}
function testCfgSystemConnection(systemId,btnEl){
  const s=cfgSystems.find(function(x){return x.id===systemId;});if(!s)return;
  if(btnEl){
    btnEl.disabled=true;
    btnEl.innerHTML='<span style="display:inline-flex;align-items:center;gap:7px"><span style="width:11px;height:11px;border:2px solid rgba(0,0,0,.15);border-top-color:currentColor;border-radius:50%;display:inline-block;animation:spin .8s linear infinite"></span>Testing connection&hellip;</span>';
  }
  setTimeout(function(){
    const endpointOk=!!(s.endpoint&&s.endpoint.trim()&&s.endpoint.trim()!=='https://'&&/^https?:\/\/.+/.test(s.endpoint.trim()));
    s.lastTested='Just now';
    if(endpointOk){s.status='Connected';s.lastTestResult='ok';}
    else{s.status='Disconnected';s.lastTestResult='fail';}
    navigatePage('cfg-system-detail');
  },1100);
}
function updateCfgApiDir(systemId,idx,dir){
  const s=cfgSystems.find(function(x){return x.id===systemId;});if(!s||!s.apiList[idx])return;
  s.apiList[idx].dir=dir;
}
function addCfgApiRow(systemId){
  const s=cfgSystems.find(function(x){return x.id===systemId;});if(!s)return;
  const nameInp=document.getElementById('cfg-newapi-name');
  const dirSel=document.getElementById('cfg-newapi-dir');
  const name=nameInp?nameInp.value.trim():'';
  if(!name){showToast('Please enter an API name','error');nameInp&&nameInp.focus();return;}
  captureCfgSystemDraft();
  s.apiList.push({name:name,dir:dirSel?dirSel.value:'r'});
  navigatePage('cfg-system-detail');
}
function removeCfgApiRow(systemId,idx){
  const s=cfgSystems.find(function(x){return x.id===systemId;});if(!s)return;
  captureCfgSystemDraft();
  s.apiList.splice(idx,1);
  navigatePage('cfg-system-detail');
}
function confirmRemoveCfgSystem(systemId){
  const s=cfgSystems.find(function(x){return x.id===systemId;});if(!s)return;
  const overlay=document.getElementById('ct-modal-overlay');if(!overlay)return;
  overlay.innerHTML='<div class="ct-modal" style="width:min(440px,92vw);text-align:center;padding:32px 30px" onclick="event.stopPropagation()">'
    +'<div style="width:56px;height:56px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;margin:0 auto 16px"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b83a3a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></div>'
    +'<div style="font-size:16px;font-weight:700;color:var(--navy);margin-bottom:10px">Remove '+s.name+'?</div>'
    +'<div style="font-size:13px;color:var(--gray);line-height:1.6;margin-bottom:22px">This disconnects the system and removes it from Systems. Models and journeys that reference it may need remapping.</div>'
    +'<div style="display:flex;justify-content:center;gap:10px"><button class="ep-cancel-btn" onclick="closeCtModal()">Cancel</button><button class="ep-save-btn" style="background:#b83a3a" onclick="removeCfgSystemConfirmed(\''+s.id+'\')">Remove system</button></div>'
    +'</div>';
  overlay.style.display='flex';
}
function removeCfgSystemConfirmed(systemId){
  const idx=cfgSystems.findIndex(function(x){return x.id===systemId;});
  if(idx>-1)cfgSystems.splice(idx,1);
  closeCtModal();
  selectedCfgSystemId=null;
  navigatePage('cfg-systems');
}
function buildCfgSystemDetailHTML(){
  const s=cfgSystems.find(function(x){return x.id===selectedCfgSystemId;})||cfgSystems[0];
  const editing=cfgSystemEditing;
  const d=editing&&cfgSystemDraft?cfgSystemDraft:s;
  const heading=editing
    ?'<div class="ep-form-group" style="margin-bottom:8px;max-width:360px"><input class="ep-form-input" id="cfg-sys-edit-name" value="'+attrSafe(d.name)+'" style="font-size:16px;font-weight:700"></div>'
    :'<p style="font-size:17px;font-weight:700;margin-bottom:6px">'+s.name+'</p><p style="font-size:12.5px;color:var(--gray);margin:0">'+s.type+' &middot; connected via released APIs</p>';
  const actionBtns=editing?'':'<div style="display:flex;gap:10px;flex-shrink:0"><button class="btn btn-secondary btn-sm" onclick="testCfgSystemConnection(\''+s.id+'\',this)">Test connection</button><button class="btn btn-primary btn-sm" onclick="startCfgSystemEdit()">Edit</button></div>';
  const connectionBlock=editing
    ?'<div class="ep-form-card" style="margin-bottom:24px">'
      +'<div class="ep-form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px 20px">'
      +'<div class="ep-form-group"><label class="ep-form-label">Type</label><input class="ep-form-input" id="cfg-sys-edit-type" value="'+attrSafe(d.type)+'"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Method</label><input class="ep-form-input" id="cfg-sys-edit-method" value="'+attrSafe(d.method)+'"></div>'
      +'<div class="ep-form-group" style="grid-column:1 / -1"><label class="ep-form-label">Endpoint</label><input class="ep-form-input" id="cfg-sys-edit-endpoint" value="'+attrSafe(d.endpoint)+'"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Authentication</label><input class="ep-form-input" id="cfg-sys-edit-auth" value="'+attrSafe(d.auth)+'"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Total released APIs</label><input class="ep-form-input" type="number" min="0" id="cfg-sys-edit-apis" value="'+attrSafe(d.apis)+'"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Status</label><select class="ep-form-select" id="cfg-sys-edit-status"><option'+(d.status==='Connected'?' selected':'')+'>Connected</option><option'+(d.status==='Disconnected'?' selected':'')+'>Disconnected</option></select></div>'
      +'</div>'
      +'<div style="display:flex;gap:10px;margin-top:18px"><button class="ep-cancel-btn" onclick="cancelCfgSystemEdit()">Cancel</button><button class="ep-save-btn" onclick="saveCfgSystemEdit(\''+s.id+'\')">Save changes</button></div>'
      +'</div>'
    :'<div class="ep-form-card" style="margin-bottom:24px">'
      +cfgKVRow('Type',s.type)
      +cfgKVRow('Method',s.method)
      +cfgKVRow('Endpoint','<span style="font-family:monospace">'+s.endpoint+'</span>')
      +cfgKVRow('Authentication',s.auth)
      +cfgKVRow('Status','<span class="status-pill '+(s.status==='Connected'?'active':'inactive')+'">'+s.status+'</span>')
      +cfgKVRow('Last tested',s.lastTested+' &middot; '+s.apis+' APIs')
      +(s.lastTestResult==='fail'?'<div style="margin-top:10px;padding:11px 14px;border-radius:9px;background:#fef2f2;border:1px solid #fecaca;color:#962f2f;font-size:12px;line-height:1.6">Test failed &mdash; the endpoint looks incomplete or unreachable. Update the endpoint (Edit) and test again.</div>':'')
      +(s.lastTestResult==='ok'?'<div style="margin-top:10px;padding:11px 14px;border-radius:9px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;line-height:1.6">Connection verified &mdash; the endpoint responded successfully.</div>':'')
      +'</div>';
  const apiRows=(s.apiList.length?s.apiList.map(function(a,i){
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)">'
      +'<div style="font-family:monospace;font-size:12.5px;font-weight:500;color:var(--navy)">'+a.name+'</div>'
      +(editing
        ?'<div style="display:flex;align-items:center;gap:8px;flex-shrink:0"><select class="ep-form-select" style="width:auto;padding:6px 10px" onchange="updateCfgApiDir(\''+s.id+'\','+i+',this.value)"><option value="r"'+(a.dir==='r'?' selected':'')+'>read</option><option value="rw"'+(a.dir==='rw'?' selected':'')+'>read + write</option></select><button type="button" class="ep-cancel-btn" style="padding:4px 9px" onclick="removeCfgApiRow(\''+s.id+'\','+i+')">Remove</button></div>'
        :cfgApiDirBadge(a.dir))
      +'</div>';
  }).join(''):'<div style="padding:16px;font-size:12.5px;color:var(--gray)">No APIs added yet.</div>');
  const addApiForm=editing
    ?'<div style="display:flex;gap:8px;padding:14px 16px;align-items:center;flex-wrap:wrap">'
      +'<input class="ep-form-input" id="cfg-newapi-name" placeholder="API name, e.g. API_PRODUCT_SRV" style="flex:1;min-width:220px">'
      +'<select class="ep-form-select" id="cfg-newapi-dir" style="width:auto"><option value="r">read</option><option value="rw">read + write</option></select>'
      +'<button type="button" class="btn btn-secondary btn-sm" onclick="addCfgApiRow(\''+s.id+'\')">+ Add API</button>'
      +'</div>'
    :'';
  const removeSection=editing?'':'<div style="margin-top:22px"><button type="button" class="ep-cancel-btn" style="color:#b83a3a;border-color:#fca5a5" onclick="confirmRemoveCfgSystem(\''+s.id+'\')">Remove system</button></div>';
  return '<div class="ai-exec-page">'
    +cfgBackBtn('cfg-systems','Systems')
    +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:24px;flex-wrap:wrap"><div>'+heading+'</div>'+actionBtns+'</div>'
    +'<div class="review-title" style="margin-bottom:12px">Connection</div>'
    +connectionBlock
    +'<div class="review-title" style="margin-bottom:12px">Available APIs'+(editing?'':' &middot; released')+'</div>'
    +'<div class="ep-form-card" style="padding:0">'+apiRows+addApiForm+'</div>'
    +removeSection
    +'</div>';
}
function cancelCfgSystemAdd(){navigatePage('cfg-systems');}
function submitCfgSystemAdd(){
  const name=document.getElementById('cfg-sys-add-name');
  if(!name||!name.value.trim()){showToast('Please enter a system name','error');name&&name.focus();return;}
  const type=(document.getElementById('cfg-sys-add-type').value||'').trim()||'Custom';
  const method=(document.getElementById('cfg-sys-add-method').value||'').trim()||'REST';
  const endpoint=(document.getElementById('cfg-sys-add-endpoint').value||'').trim()||'https://';
  const auth=(document.getElementById('cfg-sys-add-auth').value||'').trim()||'API Key';
  const id=cfgSlug(name.value.trim());
  cfgSystems.unshift({id:id,name:name.value.trim(),type:type,method:method,endpoint:endpoint,auth:auth,apis:0,lastTested:'Never',status:'Disconnected',apiList:[]});
  selectedCfgSystemId=id;cfgSystemEditing=false;
  navigatePage('cfg-system-detail');
}
function buildCfgSystemAddHTML(){
  return '<div class="ai-exec-page">'
    +cfgBackBtn('cfg-systems','Systems')
    +'<div style="margin-bottom:20px"><p style="font-size:17px;font-weight:700;margin-bottom:6px">Add Custom System</p><p style="font-size:12.5px;color:var(--gray);margin:0;max-width:560px">Connect a new system so its models and APIs become available to Data Foundation and Context &amp; Journey. You can test the connection and add APIs afterward.</p></div>'
    +'<div class="ep-form-card">'
    +'<div class="ep-form-title">Connection details</div>'
    +'<div class="ep-form-group" style="margin-bottom:14px"><label class="ep-form-label">System name <span class="req">*</span></label><input class="ep-form-input" id="cfg-sys-add-name" placeholder="e.g. Workday, NetSuite, Custom HRIS"></div>'
    +'<div class="ep-form-group" style="margin-bottom:14px"><label class="ep-form-label">Type</label><input class="ep-form-input" id="cfg-sys-add-type" placeholder="e.g. HRIS, ERP, 3rd-party"></div>'
    +'<div class="ep-form-group" style="margin-bottom:14px"><label class="ep-form-label">Method</label><input class="ep-form-input" id="cfg-sys-add-method" placeholder="e.g. REST, SOAP, Web Network"></div>'
    +'<div class="ep-form-group" style="margin-bottom:14px"><label class="ep-form-label">Endpoint</label><input class="ep-form-input" id="cfg-sys-add-endpoint" placeholder="https://"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Authentication</label><input class="ep-form-input" id="cfg-sys-add-auth" placeholder="e.g. OAuth 2.0, API Key"></div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;margin-top:18px"><button class="ep-cancel-btn" onclick="cancelCfgSystemAdd()">Cancel</button><button class="ep-save-btn" onclick="submitCfgSystemAdd()">Add system</button></div>'
    +'</div>';
}

// -- Configure: Data models (list + detail, fully configurable) --
function cfgModelSlug(str){
  const base=String(str).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'model';
  let id=base,n=1;
  while(cfgModels.some(function(m){return m.id===id;})){n++;id=base+'-'+n;}
  return id;
}
function cfgTypeSelect(id,current){
  const opts=['string','decimal','number','boolean','date','object'];
  return '<select class="ep-form-select" style="width:auto" id="'+id+'">'+opts.map(function(o){return '<option'+(o===current?' selected':'')+'>'+o+'</option>';}).join('')+'</select>';
}
function viewCfgModel(id){selectedCfgModelId=id;cfgModelEditing=false;cfgModelDraft=null;navigatePage('cfg-model-detail');}
function buildCfgDataFoundationHTML(){
  cfgModelEditing=false;cfgModelDraft=null;
  const cards=cfgModels.length
    ?cfgModels.map(function(m){
      return '<div class="ai-journey-card" onclick="viewCfgModel(\''+m.id+'\')">'
        +'<div class="ai-journey-card-top"><div class="ai-journey-name">'+m.name+'</div></div>'
        +'<div class="ai-journey-desc">'+m.desc+'</div>'
        +'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">'
        +'<span class="badge">'+m.mapped.length+' mapped</span>'
        +'<span class="badge" style="color:var(--navy);border-color:#cbd5e1;background:#f1f5f9">'+m.enrichment.length+' enrichment</span>'
        +'<span class="badge">'+m.source+'</span>'
        +'</div></div>';
    }).join('')
    :'<div class="ep-form-card" style="text-align:center;color:var(--gray);font-size:12.5px;padding:32px">No models yet — define your first one.</div>';
  return '<div class="ai-exec-page">'
    +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:20px;flex-wrap:wrap">'
    +'<div><p style="font-size:14px;font-weight:600;margin-bottom:4px">Data Foundation</p><p style="font-size:12px;color:var(--gray);margin:0;max-width:600px">Your unified objects — mapped from source systems, plus enrichment held in Data Foundation.</p></div>'
    +'<button class="btn btn-primary btn-sm" style="flex-shrink:0" onclick="navigatePage(\'cfg-model-add\')">+ New Model</button>'
    +'</div>'
    +'<div class="ai-journey-grid">'+cards+'</div>'
    +'</div>';
}
function cfgMapRow(unified,source,type){
  return '<div style="display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px dashed var(--border)">'
    +'<div style="flex:1;font-size:13px;font-weight:600;color:var(--navy)">'+unified+'</div>'
    +'<div style="color:#cbd5e1">&larr;</div>'
    +'<div style="flex:1;font-family:monospace;font-size:12px;color:var(--gray)">'+source+'</div>'
    +'<div style="width:60px;text-align:right;font-size:11px;color:#9ca3af">'+type+'</div>'
    +'</div>';
}
function cfgEnrichRow(e){
  return '<div style="display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px dashed rgba(26,26,26,.25)">'
    +'<div style="flex:1;font-size:13px;font-weight:600;color:var(--orange)">'+e.name+'</div>'
    +'<div style="color:#f1c27a">&larr;</div>'
    +'<div style="flex:1;font-size:12px;color:var(--gray)">added in Data Foundation</div>'
    +'<div style="width:60px;text-align:right;font-size:11px;color:#9ca3af">'+e.type+'</div>'
    +'</div>';
}
function cfgSampleValueFor(m,fieldName,type){
  const found=(m.sample||[]).find(function(pair){return pair[0]===fieldName;});
  if(found)return found[1];
  const t=(type||'string').toLowerCase();
  if(t==='decimal'||t==='number')return '42.00';
  if(t==='boolean')return 'true';
  if(t==='date')return '2026-01-01';
  if(t==='object')return '{ ... }';
  return 'Sample value';
}
function startCfgModelEdit(){
  const m=cfgModels.find(function(x){return x.id===selectedCfgModelId;});if(!m)return;
  cfgModelDraft={
    name:m.name,source:m.source,desc:m.desc,
    makerChecker:m.rules.makerChecker,validation:m.rules.validation,
    mapped:m.mapped.map(function(r){return r.slice();}),
    enrichment:m.enrichment.map(function(e){return {name:e.name,type:e.type};})
  };
  cfgModelEditing=true;
  navigatePage('cfg-model-detail');
}
function cancelCfgModelEdit(){cfgModelEditing=false;cfgModelDraft=null;navigatePage('cfg-model-detail');}
function syncCfgModelDraftFromDOM(){
  if(!cfgModelDraft)return;
  const g=function(id){const el=document.getElementById(id);return el?el.value:undefined;};
  const name=g('cfg-model-edit-name');if(name!==undefined)cfgModelDraft.name=name;
  const source=g('cfg-model-edit-source');if(source!==undefined)cfgModelDraft.source=source;
  const desc=g('cfg-model-edit-desc');if(desc!==undefined)cfgModelDraft.desc=desc;
  const mc=document.getElementById('cfg-model-edit-mc');if(mc)cfgModelDraft.makerChecker=mc.checked;
  const val=g('cfg-model-edit-validation');if(val!==undefined)cfgModelDraft.validation=val;
  cfgModelDraft.mapped=cfgModelDraft.mapped.map(function(row,i){
    const u=g('cfg-map-u-'+i),s=g('cfg-map-s-'+i),t=g('cfg-map-t-'+i);
    return [u!==undefined?u:row[0],s!==undefined?s:row[1],t!==undefined?t:row[2]];
  });
  cfgModelDraft.enrichment=cfgModelDraft.enrichment.map(function(e,i){
    const n=g('cfg-enr-n-'+i),t=g('cfg-enr-t-'+i);
    return {name:n!==undefined?n:e.name,type:t!==undefined?t:e.type};
  });
}
function addCfgMappedRow(){syncCfgModelDraftFromDOM();cfgModelDraft.mapped.push(['','','string']);navigatePage('cfg-model-detail');}
function removeCfgMappedRow(idx){syncCfgModelDraftFromDOM();cfgModelDraft.mapped.splice(idx,1);navigatePage('cfg-model-detail');}
function addCfgEnrichRow(){syncCfgModelDraftFromDOM();cfgModelDraft.enrichment.push({name:'',type:'string'});navigatePage('cfg-model-detail');}
function removeCfgEnrichRow(idx){syncCfgModelDraftFromDOM();cfgModelDraft.enrichment.splice(idx,1);navigatePage('cfg-model-detail');}
function saveCfgModelEdit(modelId){
  const m=cfgModels.find(function(x){return x.id===modelId;});if(!m)return;
  const nameEl=document.getElementById('cfg-model-edit-name');
  if(!nameEl||!nameEl.value.trim()){showToast('Please enter a model name','error');nameEl&&nameEl.focus();return;}
  m.name=nameEl.value.trim();
  const sourceEl=document.getElementById('cfg-model-edit-source');if(sourceEl)m.source=sourceEl.value.trim()||m.source;
  const descEl=document.getElementById('cfg-model-edit-desc');if(descEl)m.desc=descEl.value.trim()||m.desc;
  const mcEl=document.getElementById('cfg-model-edit-mc');m.rules.makerChecker=mcEl?mcEl.checked:m.rules.makerChecker;
  const valEl=document.getElementById('cfg-model-edit-validation');if(valEl)m.rules.validation=valEl.value.trim();
  const mapCount=cfgModelDraft?cfgModelDraft.mapped.length:0;
  const mapped=[];
  for(let i=0;i<mapCount;i++){
    const u=document.getElementById('cfg-map-u-'+i),s=document.getElementById('cfg-map-s-'+i),t=document.getElementById('cfg-map-t-'+i);
    const uname=u?u.value.trim():'';
    if(uname)mapped.push([uname,s?s.value.trim():'',t?t.value:'string']);
  }
  m.mapped=mapped;
  const enrCount=cfgModelDraft?cfgModelDraft.enrichment.length:0;
  const enrichment=[];
  for(let i=0;i<enrCount;i++){
    const n=document.getElementById('cfg-enr-n-'+i),t=document.getElementById('cfg-enr-t-'+i);
    const ename=n?n.value.trim():'';
    if(ename)enrichment.push({name:ename,type:t?t.value:'string'});
  }
  m.enrichment=enrichment;
  cfgModelEditing=false;cfgModelDraft=null;
  navigatePage('cfg-model-detail');
}
function confirmRemoveCfgModel(modelId){
  const m=cfgModels.find(function(x){return x.id===modelId;});if(!m)return;
  const overlay=document.getElementById('ct-modal-overlay');if(!overlay)return;
  overlay.innerHTML='<div class="ct-modal" style="width:min(440px,92vw);text-align:center;padding:32px 30px" onclick="event.stopPropagation()">'
    +'<div style="width:56px;height:56px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;margin:0 auto 16px"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b83a3a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></div>'
    +'<div style="font-size:16px;font-weight:700;color:var(--navy);margin-bottom:10px">Remove '+m.name+'?</div>'
    +'<div style="font-size:13px;color:var(--gray);line-height:1.6;margin-bottom:22px">This removes the model from Data Foundation. Journeys or agents that reference it may need remapping.</div>'
    +'<div style="display:flex;justify-content:center;gap:10px"><button class="ep-cancel-btn" onclick="closeCtModal()">Cancel</button><button class="ep-save-btn" style="background:#b83a3a" onclick="removeCfgModelConfirmed(\''+m.id+'\')">Remove model</button></div>'
    +'</div>';
  overlay.style.display='flex';
}
function removeCfgModelConfirmed(modelId){
  const idx=cfgModels.findIndex(function(x){return x.id===modelId;});
  if(idx>-1)cfgModels.splice(idx,1);
  closeCtModal();
  selectedCfgModelId=null;
  navigatePage('cfg-data-foundation');
}
function testCfgModel(modelId,btnEl){
  const m=cfgModels.find(function(x){return x.id===modelId;});if(!m)return;
  if(btnEl){
    btnEl.disabled=true;
    btnEl.innerHTML='<span style="display:inline-flex;align-items:center;gap:7px"><span style="width:11px;height:11px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin .8s linear infinite;opacity:.9"></span>Fetching&hellip;</span>';
  }
  setTimeout(function(){
    cfgModelTested[modelId]=true;
    renderPageContent('adt-content');
  },900);
}
function cancelCfgModelAdd(){navigatePage('cfg-data-foundation');}
function submitCfgModelAdd(){
  const name=document.getElementById('cfg-model-add-name');
  if(!name||!name.value.trim()){showToast('Please enter a model name','error');name&&name.focus();return;}
  const source=(document.getElementById('cfg-model-add-source').value||'').trim()||'Custom';
  const desc=(document.getElementById('cfg-model-add-desc').value||'').trim()||'Unified object defined in Data Foundation.';
  const id=cfgModelSlug(name.value.trim());
  cfgModels.unshift({id:id,name:name.value.trim(),source:source,desc:desc,mapped:[],enrichment:[],rules:{makerChecker:false,validation:''},sample:[]});
  selectedCfgModelId=id;cfgModelEditing=false;cfgModelDraft=null;
  navigatePage('cfg-model-detail');
}
function buildCfgModelAddHTML(){
  return '<div class="ai-exec-page">'
    +cfgBackBtn('cfg-data-foundation','Data Foundation')
    +'<div style="margin-bottom:20px"><p style="font-size:17px;font-weight:700;margin-bottom:6px">New Model</p><p style="font-size:12.5px;color:var(--gray);margin:0;max-width:560px">Define a new unified object. You can add field mappings and enrichment fields afterward, from its detail page.</p></div>'
    +'<div class="ep-form-card">'
    +'<div class="ep-form-title">Model details</div>'
    +'<div class="ep-form-group" style="margin-bottom:14px"><label class="ep-form-label">Model name <span class="req">*</span></label><input class="ep-form-input" id="cfg-model-add-name" placeholder="e.g. Purchase Order, Employee, Invoice"></div>'
    +'<div class="ep-form-group" style="margin-bottom:14px"><label class="ep-form-label">Source system(s)</label><input class="ep-form-input" id="cfg-model-add-source" placeholder="e.g. SAP, SAP + Infor"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Description</label><input class="ep-form-input" id="cfg-model-add-desc" placeholder="What this object represents"></div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;margin-top:18px"><button class="ep-cancel-btn" onclick="cancelCfgModelAdd()">Cancel</button><button class="ep-save-btn" onclick="submitCfgModelAdd()">Create model</button></div>'
    +'</div>';
}
function buildCfgModelDetailHTML(){
  const m=cfgModels.find(function(x){return x.id===selectedCfgModelId;})||cfgModels[0];
  const editing=cfgModelEditing;
  const dm=editing&&cfgModelDraft?cfgModelDraft:{name:m.name,source:m.source,desc:m.desc,makerChecker:m.rules.makerChecker,validation:m.rules.validation,mapped:m.mapped,enrichment:m.enrichment};
  const heading=editing
    ?'<div class="ep-form-card" style="margin-bottom:18px">'
      +'<div class="ep-form-title">Model details</div>'
      +'<div class="ep-form-group" style="margin-bottom:14px"><label class="ep-form-label">Model name</label><input class="ep-form-input" id="cfg-model-edit-name" value="'+attrSafe(dm.name)+'"></div>'
      +'<div class="ep-form-group" style="margin-bottom:14px"><label class="ep-form-label">Source system(s)</label><input class="ep-form-input" id="cfg-model-edit-source" value="'+attrSafe(dm.source)+'"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Description</label><input class="ep-form-input" id="cfg-model-edit-desc" value="'+attrSafe(dm.desc)+'"></div>'
      +'</div>'
    :'<div style="margin-bottom:24px"><p style="font-size:17px;font-weight:700;margin-bottom:6px">'+m.name+'</p><p style="font-size:12.5px;color:var(--gray);margin:0">Unified object &middot; source: '+m.source+'</p><p style="font-size:12.5px;color:var(--gray);margin-top:4px">'+m.desc+'</p></div>';
  const actionBtns=editing?'':'<div style="display:flex;gap:10px;flex-shrink:0"><button class="btn btn-primary btn-sm" onclick="startCfgModelEdit()">Edit</button></div>';
  const mapSection=editing
    ?'<div class="ep-form-card" style="margin-bottom:18px">'
      +'<div class="ep-form-title">Field mapping &middot; from '+attrSafe(dm.source)+'</div>'
      +dm.mapped.map(function(f,i){
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px dashed var(--border);flex-wrap:wrap">'
          +'<input class="ep-form-input" style="flex:1;min-width:140px" id="cfg-map-u-'+i+'" value="'+attrSafe(f[0])+'" placeholder="Unified field">'
          +'<input class="ep-form-input" style="flex:1;min-width:140px;font-family:monospace" id="cfg-map-s-'+i+'" value="'+attrSafe(f[1])+'" placeholder="Source field">'
          +cfgTypeSelect('cfg-map-t-'+i,f[2])
          +'<button type="button" class="ep-cancel-btn" style="padding:4px 9px" onclick="removeCfgMappedRow('+i+')">Remove</button>'
          +'</div>';
      }).join('')
      +'<button type="button" class="btn btn-secondary btn-sm" style="margin-top:14px" onclick="addCfgMappedRow()">+ Add mapped field</button>'
      +'</div>'
    :'<div class="ep-form-card" style="margin-bottom:18px">'
      +'<div class="ep-form-title">Field mapping &middot; from '+m.source+'</div>'
      +(m.mapped.length?m.mapped.map(function(f){return cfgMapRow(f[0],f[1],f[2]);}).join(''):'<div style="padding:12px 0;font-size:12.5px;color:var(--gray)">No fields mapped yet.</div>')
      +'</div>';
  const enrichSection=editing
    ?'<div class="ep-form-card" style="margin-bottom:18px;border-color:#f1c27a">'
      +'<div class="ep-form-title" style="color:var(--orange);border-bottom-color:rgba(26,26,26,.25)">Enrichment &middot; extra fields held in Data Foundation</div>'
      +dm.enrichment.map(function(e,i){
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px dashed rgba(26,26,26,.25);flex-wrap:wrap">'
          +'<input class="ep-form-input" style="flex:1;min-width:160px" id="cfg-enr-n-'+i+'" value="'+attrSafe(e.name)+'" placeholder="Enrichment field name">'
          +cfgTypeSelect('cfg-enr-t-'+i,e.type)
          +'<button type="button" class="ep-cancel-btn" style="padding:4px 9px" onclick="removeCfgEnrichRow('+i+')">Remove</button>'
          +'</div>';
      }).join('')
      +'<button type="button" class="btn btn-secondary btn-sm" style="margin-top:14px;border:1px dashed #f1c27a;color:var(--orange);background:transparent" onclick="addCfgEnrichRow()">+ Add enrichment field</button>'
      +'</div>'
    :'<div class="ep-form-card" style="margin-bottom:18px;border-color:#f1c27a">'
      +'<div class="ep-form-title" style="color:var(--orange);border-bottom-color:rgba(26,26,26,.25)">Enrichment &middot; extra fields held in Data Foundation</div>'
      +(m.enrichment.length?m.enrichment.map(function(e){return cfgEnrichRow(e);}).join(''):'<div style="padding:12px 0;font-size:12.5px;color:var(--gray)">No enrichment fields yet.</div>')
      +'</div>';
  const rulesSection=editing
    ?'<div class="ep-form-card" style="margin-bottom:18px">'
      +'<div class="ep-form-title">Rules</div>'
      +'<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center">'
      +'<div style="display:flex;align-items:center;gap:10px"><label class="cs-toggle"><input type="checkbox" id="cfg-model-edit-mc"'+(dm.makerChecker?' checked':'')+'><span class="cs-toggle-slider"></span></label><span style="font-size:13px;color:var(--navy)">Maker-checker &middot; AI drafts, human approves</span></div>'
      +'<div class="ep-form-group" style="flex:1;min-width:260px"><label class="ep-form-label">Validation rule</label><input class="ep-form-input" id="cfg-model-edit-validation" value="'+attrSafe(dm.validation)+'" placeholder="e.g. Base price must be greater than zero"></div>'
      +'</div></div>'
    :'<div class="ep-form-card" style="margin-bottom:18px">'
      +'<div class="ep-form-title">Rules</div>'
      +'<div style="display:flex;gap:14px;flex-wrap:wrap">'
      +'<div style="flex:1;min-width:220px"><div style="font-size:11px;color:var(--gray);margin-bottom:5px">Maker-checker</div><div style="font-size:13px;font-weight:600;color:'+(m.rules.makerChecker?'#16a34a':'#6b7280')+'">'+(m.rules.makerChecker?'On · AI drafts, human approves':'Off · no review required')+'</div></div>'
      +'<div style="flex:1;min-width:220px"><div style="font-size:11px;color:var(--gray);margin-bottom:5px">Validation</div><div style="font-size:13px;font-weight:600;color:var(--navy)">'+(m.rules.validation||'&mdash;')+'</div></div>'
      +'</div></div>';
  const allFields=m.mapped.map(function(f){return{name:f[0],type:f[2]};}).concat(m.enrichment);
  const sample=cfgModelTested[m.id]
    ?(allFields.length
      ?'<div class="review-section" style="border-color:#93c5fd;background:#eff6ff;margin-top:14px">'
        +'<div class="review-title" style="color:#1d4ed8">Live sample &middot; fetched from '+m.source+' just now</div>'
        +'<div class="review-grid" style="grid-template-columns:1fr">'
        +allFields.map(function(f){return aiDrawerRow(f.name,cfgSampleValueFor(m,f.name,f.type));}).join('')
        +'</div>'
        +'<div style="font-size:11px;color:#1d4ed8;margin-top:10px;display:flex;align-items:center;gap:7px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Fetched live &middot; not stored, 0 records kept after this view</div>'
        +'</div>'
      :'<div class="review-section" style="margin-top:14px"><div style="font-size:12.5px;color:var(--gray)">No fields mapped yet &mdash; add a field mapping above, then test again.</div></div>')
    :'';
  const removeSection=editing?'':'<div style="margin-top:22px"><button type="button" class="ep-cancel-btn" style="color:#b83a3a;border-color:#fca5a5" onclick="confirmRemoveCfgModel(\''+m.id+'\')">Remove model</button></div>';
  const saveCancelBar=editing?'<div style="display:flex;gap:10px;margin-bottom:18px"><button class="ep-cancel-btn" onclick="cancelCfgModelEdit()">Cancel</button><button class="ep-save-btn" onclick="saveCfgModelEdit(\''+m.id+'\')">Save changes</button></div>':'';
  const fetchSampleSection=editing?'':'<div class="ep-form-card">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px">'
    +'<div><div style="font-size:13.5px;font-weight:700;color:var(--navy)">Fetch a sample record</div><div style="font-size:12px;color:var(--gray);margin-top:3px;max-width:480px">Pulls one live record through the mapping above &mdash; to prove the wiring, without storing anything.</div></div>'
    +'<button class="btn btn-primary btn-sm" onclick="testCfgModel(\''+m.id+'\',this)">Run test</button>'
    +'</div>'
    +sample
    +'</div>';
  return '<div class="ai-exec-page">'
    +cfgBackBtn('cfg-data-foundation','Data Foundation')
    +(editing
      ?heading
      :'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px"><div style="flex:1;min-width:0">'+heading+'</div>'+actionBtns+'</div>')
    +mapSection
    +enrichSection
    +rulesSection
    +saveCancelBar
    +fetchSampleSection
    +removeSection
    +'</div>';
}

// -- Configure: Context & Journey (list + detail + agent/governance drawer) --
function viewCfgJourney(id){selectedCfgJourneyId=id;navigatePage('cfg-journey-detail');}
function cfgJourneyStatusPill(status){
  if(status==='Active')return '<span class="status-pill active">Active</span>';
  if(status==='Draft')return '<span class="status-pill draft">Draft</span>';
  return '';
}
function buildCfgContextJourneyHTML(){
  const cards=cfgJourneys.map(function(j){
    return '<div class="ai-journey-card" style="flex-direction:row;align-items:center;justify-content:space-between;gap:24px" onclick="viewCfgJourney(\''+j.id+'\')">'
      +'<div style="flex:1;min-width:0">'
      +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap"><div class="ai-journey-name">'+j.name+'</div>'+cfgJourneyStatusPill(j.status)+'</div>'
      +'<div class="ai-journey-desc" style="white-space:normal;overflow:visible;text-overflow:clip;max-width:640px">'+j.desc+'</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">'+j.tags.map(function(t){return '<span class="badge">'+t+'</span>';}).join('')+'</div>'
      +'</div>'
      +'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="9 6 15 12 9 18"/></svg>'
      +'</div>';
  }).join('');
  return '<div class="ai-exec-page">'
    +cfgPageHead('Context & Journey','Pick a predefined business journey to see its steps and assign the agent and governance that runs each one.')
    +'<div style="display:flex;flex-direction:column;gap:16px">'+cards+'</div>'
    +'</div>';
}
function cfgStepTypeTag(type){
  if(type==='eng')return '<span class="badge" style="color:var(--gray)">Engine</span>';
  if(type==='rule')return '<span class="badge" style="color:var(--navy);border-color:#cbd5e1;background:#f1f5f9">'+'Rule</span>';
  return '<span class="badge" style="color:#0d9488;background:#f0fdfa;border-color:#99f6e4">Source</span>';
}
function buildCfgJourneyDetailHTML(){
  const j=cfgJourneys.find(function(x){return x.id===selectedCfgJourneyId;})||cfgJourneys[0];
  const timeline=j.steps.map(function(st,i){
    const key=j.id+'__'+i;
    const assign=cfgStepAssignments[key];
    const isHuman=st.type==='rule';
    const rec=(!assign&&!isHuman)?cfgRecommendedAgentForStep(st):null;
    const assignBadge=isHuman
      ?'<span class="badge" style="margin-left:6px">Human approval required</span>'
      :assign
        ?'<span class="badge" style="margin-left:6px">Agent: '+assign.agent+'</span>'
        :rec
          ?'<span class="badge cfg-agent-recommend" style="margin-left:6px" onclick="event.stopPropagation();assignRecommendedAgent(\''+j.id+'\','+i+')">&#10024; Recommended: '+rec.name+' &mdash; click to assign</span>'
          :'<span class="badge" style="margin-left:6px">No agent assigned yet</span>';
    return '<div class="ai-timeline-item">'
      +'<div class="ai-timeline-dot">'+(i+1)+'</div>'
      +'<div class="ai-timeline-card" onclick="openCfgStepDrawer(\''+j.id+'\','+i+')">'
      +'<div class="ai-timeline-card-head"><span class="ai-timeline-card-title">'+st.name+'</span></div>'
      +'<div class="ai-timeline-card-desc">'+st.src+'</div>'
      +'<div class="ai-timeline-chips">'+cfgStepTypeTag(st.type)+assignBadge+'</div>'
      +'</div></div>';
  }).join('');
  return '<div class="ai-exec-page ai-journey-detail-page">'
    +cfgBackBtn('cfg-context-journey','Context & Journey')
    +'<div style="margin-bottom:24px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><p style="font-size:17px;font-weight:700;margin:0">'+j.name+'</p>'+cfgJourneyStatusPill(j.status)+'</div>'
    +'<p style="font-size:12.5px;color:var(--gray);margin:-14px 0 24px;max-width:680px;line-height:1.6">'+j.desc+'</p>'
    +'<div class="review-title" style="margin-bottom:14px">Flow &middot; runs top to bottom &middot; click a step to assign an agent</div>'
    +'<div class="ai-timeline">'+timeline+'</div>'
    +'<button class="btn btn-secondary btn-sm" style="margin-top:16px;margin-left:44px;border-style:dashed">+ Add step</button>'
    +'</div>';
}
function openCfgStepDrawer(journeyId,idx){
  cfgDrawerJourneyId=journeyId;cfgDrawerStepIdx=idx;
  const overlay=document.getElementById('ct-modal-overlay');if(!overlay)return;
  overlay.innerHTML=renderCfgStepDrawer();
  overlay.style.display='flex';
}
function closeCfgStepDrawer(){
  cfgDrawerJourneyId=null;cfgDrawerStepIdx=-1;
  const overlay=document.getElementById('ct-modal-overlay');if(overlay){overlay.style.display='none';overlay.innerHTML='';}
}
function renderCfgStepDrawer(){
  const j=cfgJourneys.find(function(x){return x.id===cfgDrawerJourneyId;});if(!j)return '';
  const st=j.steps[cfgDrawerStepIdx];if(!st)return '';
  const key=j.id+'__'+cfgDrawerStepIdx;
  const assign=cfgStepAssignments[key]||{};
  const isHuman=st.type==='rule';
  const rec=(!assign.agent&&!isHuman)?cfgRecommendedAgentForStep(st):null;
  const defaultAgent=assign.agent||(rec?rec.name:'');
  const recBanner=rec?'<div class="info-box tip" style="margin-bottom:14px"><div class="ib-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg></div><div><strong>Recommended: '+rec.name+'</strong>This agent already handles this exact step.<div style="margin-top:8px"><button class="btn btn-primary btn-sm" onclick="assignRecommendedAgent(\''+j.id+'\','+cfgDrawerStepIdx+');closeCfgStepDrawer()">Use this agent</button></div></div></div>':'';
  const header='<div class="ct-modal-hdr"><span class="ct-modal-title">'+st.name+'</span><button class="ct-modal-close" onclick="closeCfgStepDrawer()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
  const body='<div class="review-section"><div class="review-title">Step Source</div><p style="font-size:12.5px;color:var(--navy);line-height:1.6">'+st.src+'</p></div>'
    +(isHuman
      ?'<div class="review-section" style="border-color:#93c5fd;background:#eff6ff"><div class="review-title" style="color:#1d4ed8">Human approval required</div><p style="font-size:12.5px;color:#1d4ed8;line-height:1.6">This step is governed by a rule and routes to a human for sign-off before the journey continues.</p></div>'
      :'<div class="review-section">'
        +'<div class="review-title">Assign agent &amp; governance</div>'
        +recBanner
        +'<div class="ep-form-group" style="margin-bottom:12px"><label class="ep-form-label">Agent</label><select class="ep-form-select" id="cfg-step-agent-sel">'
        +'<option value="">Unassigned</option>'
        +cfgAgents.map(function(a){return '<option value="'+a.name+'"'+(defaultAgent===a.name?' selected':'')+'>'+a.name+'</option>';}).join('')
        +'</select></div>'
        +'<div style="font-size:11.5px;color:var(--gray);line-height:1.6;margin-bottom:14px">Governance: the assigned agent reads this step\'s allowed actions and failure handling from its governance file before it can act.</div>'
        +'<button class="btn btn-primary btn-sm" onclick="saveCfgStepAssignment(\''+j.id+'\','+cfgDrawerStepIdx+')">Save assignment</button>'
        +'</div>');
  return '<div class="ct-modal" style="width:min(600px,92vw)" onclick="event.stopPropagation()">'+header+body+'</div>';
}
function saveCfgStepAssignment(journeyId,idx){
  const sel=document.getElementById('cfg-step-agent-sel');
  const agent=sel?sel.value:'';
  const key=journeyId+'__'+idx;
  if(agent)cfgStepAssignments[key]={agent:agent,governance:'Default governance'};
  else delete cfgStepAssignments[key];
  closeCfgStepDrawer();
  if(page==='cfg-journey-detail')navigatePage('cfg-journey-detail');
}
function cfgRecommendedAgentForStep(st){
  if(st.type==='rule')return null;
  return findCfgAgentByName(st.src)||null;
}
function assignRecommendedAgent(journeyId,idx){
  const j=cfgJourneys.find(function(x){return x.id===journeyId;});if(!j)return;
  const st=j.steps[idx];if(!st)return;
  const rec=cfgRecommendedAgentForStep(st);if(!rec)return;
  const key=journeyId+'__'+idx;
  cfgStepAssignments[key]={agent:rec.name,governance:rec.guardrail||'Default governance'};
  if(page==='cfg-journey-detail')navigatePage('cfg-journey-detail');
}

// -- Configure: Agents --
function cfgEscapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function cfgAgentSlug(name){return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
function findCfgAgentByName(name){return cfgAgents.find(function(a){return a.name===name;});}
function viewCfgAgentSkillByName(name){
  const idx=cfgAgents.findIndex(function(a){return a.name===name;});
  if(idx===-1)return;
  viewCfgAgentSkill(idx);
}
function viewCfgAgentSkill(idx){
  cfgAgentSkillModalIdx=idx;
  cfgAgentSkillEditing=false;
  const overlay=document.getElementById('ct-modal-overlay');if(!overlay)return;
  overlay.innerHTML=renderCfgAgentSkillModal();
  overlay.style.display='flex';
}
function closeCfgAgentSkillModal(){
  cfgAgentSkillModalIdx=-1;cfgAgentSkillEditing=false;
  const overlay=document.getElementById('ct-modal-overlay');if(overlay){overlay.style.display='none';overlay.innerHTML='';}
}
function refreshCfgAgentSkillModal(){
  const overlay=document.getElementById('ct-modal-overlay');if(!overlay)return;
  overlay.innerHTML=renderCfgAgentSkillModal();
}
function startCfgAgentSkillEdit(){cfgAgentSkillEditing=true;refreshCfgAgentSkillModal();}
function cancelCfgAgentSkillEdit(){cfgAgentSkillEditing=false;refreshCfgAgentSkillModal();}
function saveCfgAgentSkillEdit(){
  const a=cfgAgents[cfgAgentSkillModalIdx];if(!a)return;
  const ta=document.getElementById('cfg-agent-skill-edit');
  if(ta)a.skillMd=ta.value;
  cfgAgentSkillEditing=false;
  refreshCfgAgentSkillModal();
}
function resetCfgAgentSkillToOriginal(){
  const idx=cfgAgentSkillModalIdx;const a=cfgAgents[idx];if(!a)return;
  a.skillMd=cfgAgentsOriginalSkill[idx];
  cfgAgentSkillEditing=false;
  refreshCfgAgentSkillModal();
}
function renderCfgAgentSkillModal(){
  const idx=cfgAgentSkillModalIdx;
  const a=cfgAgents[idx];if(!a)return '';
  const filename=cfgAgentSlug(a.name)+'/skill.md';
  const modified=a.skillMd!==cfgAgentsOriginalSkill[idx];
  const header='<div class="ct-modal-hdr"><span class="ct-modal-title" style="font-family:monospace;font-size:12.5px;display:flex;align-items:center;gap:8px">'+filename
    +(modified?'<span class="badge" style="color:var(--navy);border-color:#cbd5e1;background:#f1f5f9;font-family:var(--body)">modified</span>':'')
    +'</span><button class="ct-modal-close" onclick="closeCfgAgentSkillModal()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
  const content=cfgAgentSkillEditing
    ?'<textarea id="cfg-agent-skill-edit" style="width:100%;min-height:360px;font-family:monospace;font-size:12px;line-height:1.7;color:var(--navy);background:var(--light);border:1px solid var(--border);border-radius:10px;padding:18px 20px;resize:vertical;box-sizing:border-box">'+cfgEscapeHtml(a.skillMd)+'</textarea>'
    :'<pre style="white-space:pre-wrap;word-break:break-word;font-family:monospace;font-size:12px;line-height:1.7;color:var(--navy);background:var(--light);border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin:0">'+cfgEscapeHtml(a.skillMd)+'</pre>';
  const actions=cfgAgentSkillEditing
    ?'<div style="display:flex;gap:10px;padding-top:14px;flex-shrink:0"><button class="ep-cancel-btn" onclick="cancelCfgAgentSkillEdit()">Cancel</button><button class="ep-save-btn" onclick="saveCfgAgentSkillEdit()">Save changes</button></div>'
    :'<div style="display:flex;gap:10px;padding-top:14px;flex-shrink:0"><button class="btn btn-primary btn-sm" onclick="startCfgAgentSkillEdit()">Edit</button>'
      +(modified?'<button class="btn btn-secondary btn-sm" onclick="resetCfgAgentSkillToOriginal()">Reset to original</button>':'')
      +'</div>';
  return '<div class="ct-modal" style="width:min(680px,94vw);max-height:82vh;display:flex;flex-direction:column" onclick="event.stopPropagation()">'
    +header
    +'<div style="overflow-y:auto;flex:1;min-height:0">'+content+'</div>'
    +actions
    +'</div>';
}
function buildCfgAgentsHTML(){
  const cards=cfgAgents.map(function(a,i){
    return '<div class="ep-form-card" style="margin-bottom:14px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:10px">'
      +'<div style="display:flex;align-items:center;gap:11px;min-width:0">'
      +'<div style="width:34px;height:34px;border-radius:9px;background:var(--ol);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="17" height="17" viewBox="0 0 24 24" fill="var(--orange)" stroke="none"><path d="M12 3c.3 3.6 1.4 4.7 5 5-3.6.3-4.7 1.4-5 5-.3-3.6-1.4-4.7-5-5 3.6-.3 4.7-1.4 5-5Z"/></svg></div>'
      +'<div style="min-width:0"><div style="font-size:14.5px;font-weight:700;color:var(--navy)">'+a.name+'</div><div style="font-size:10.5px;color:var(--gray);margin-top:2px">'+a.type+' &middot; <span style="color:#16a34a">active</span></div></div>'
      +'</div>'
      +'<button type="button" class="btn btn-secondary btn-sm" style="flex-shrink:0" onclick="viewCfgAgentSkill('+i+')">Agent Skill</button>'
      +'</div>'
      +'<div style="font-size:12.5px;color:var(--gray);line-height:1.6;margin-bottom:12px">'+a.desc+'</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:7px">'
      +'<span class="badge" style="color:var(--navy);background:#f1f5f9">Model &middot; '+a.model+'</span>'
      +'<span class="badge" style="color:var(--navy);background:#f1f5f9">Used in &middot; '+a.usedIn+'</span>'
      +'<span class="badge" style="color:var(--navy);background:#f1f5f9">Guardrail &middot; '+a.guardrail+'</span>'
      +'</div>'
      +'</div>';
  }).join('');
  return '<div class="ai-exec-page">'
    +cfgPageHead('Agents','The agents that read, draft and act — always inside your rules.')
    +cards
    +'</div>';
}

const aiEntityOptions=['ADT Netherlands B.V.','ADT Germany GmbH','ADT India Pvt Ltd','ADT Spain S.L.','ADT UK Ltd'];
const aiCountryOptions=['Netherlands','India','Germany','Spain','United Kingdom'];
const aiEmploymentTypeOptions=['EOR','PEO','Contractor'];
const aiTriggerOptions=[
  {title:'Trigger when proposal is approved',desc:'Automatically starts this journey the moment a proposal reaches Approved status.'},
  {title:'Trigger when contract is created',desc:'Starts this journey as soon as a new contract record is created in ADT.'},
  {title:'Trigger manually',desc:'Admin starts this journey on demand from the journey detail page.'},
  {title:'Trigger on schedule',desc:'Runs automatically on a recurring schedule you define, e.g. daily or weekly.'}
];
const aiValidationChecklist=['Approved proposal required','Active contract template required','Entity mapping required','Client signatory required','Country rules required','Salary/commercial terms required','Payroll data required','Compliance documents required'];
let aiAutomationConfigs={};
let aiAutomateStep=0;
let aiAutomateFormData={};
let aiAutomateSkipPicker=false;
let aiAutomateProgress={};
function aiAutomateVisibleSteps(){return aiAutomateSkipPicker?[1,2,3,4,5,6]:[0,1,2,3,4,5,6];}
function aiAutomateResumeOrStart(journeyId){
  selectedAIJourneyId=journeyId;
  const saved=aiAutomateProgress[journeyId];
  if(saved){aiAutomateStep=saved.step;aiAutomateFormData=Object.assign({},saved.formData);}
  else{aiAutomateStep=1;aiAutomateFormData={};}
}
function aiAutomateSaveProgress(){
  aiAutomateCaptureStep();
  if(!selectedAIJourneyId||aiAutomateStep===0)return;
  aiAutomateProgress[selectedAIJourneyId]={step:aiAutomateStep,formData:Object.assign({},aiAutomateFormData)};
  const j=aiJourneys.find(function(x){return x.id===selectedAIJourneyId;});
  if(j&&j.status!=='Active')j.status='Draft';
}
const aiAutomateSteps=[
  {label:'Select Journey',desc:'Choose which business journey you want to configure AI automation for.'},
  {label:'Basic Details',desc:'Name this automation and set the entity, country, and employment type it applies to.'},
  {label:'Trigger',desc:'Choose what starts this journey automatically.'},
  {label:'Automation Scope',desc:'Decide what AI can handle at each event, and where a human must stay in the loop.'},
  {label:'Approval Rules',desc:'Assign who signs off on the key actions in this journey.'},
  {label:'Data Validation',desc:'Choose which checks must pass before AI is allowed to proceed.'},
  {label:'Review & Activate',desc:'Review your configuration below, then save it as a draft or activate it.'}
];

function aiEventIsToggleable(e){return e.chips.includes('AI Automated');}
function aiScopeDefaults(e){
  const toggleable=aiEventIsToggleable(e);
  return {mode:toggleable?'ai':'manual'};
}
function aiScopeModeChoose(el,i,mode,eventName){
  const seg=el.parentElement;
  const activeBtn=seg.querySelector('.seg-btn.active');
  const currentMode=activeBtn?activeBtn.getAttribute('data-mode'):null;
  if(currentMode===mode)return;
  document.getElementById('ct-modal-overlay').innerHTML=
    '<div class="ct-modal" style="width:min(460px,92vw);text-align:center;padding:34px 32px" onclick="event.stopPropagation()">'
    +'<div style="width:64px;height:64px;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;margin:0 auto 18px"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17.02" x2="12.01" y2="17.02"/></svg></div>'
    +'<div style="font-size:17px;font-weight:700;color:var(--navy);margin-bottom:12px">Confirm Change</div>'
    +'<div style="font-size:13.5px;color:var(--gray);line-height:1.65;margin-bottom:26px">Set <strong style="color:var(--navy)">'+eventName+'</strong> to run as <strong style="color:var(--navy)">'+(mode==='ai'?'AI Automated':'Manual')+'</strong>?</div>'
    +'<div style="display:flex;justify-content:center;gap:12px">'
    +'<button class="ep-cancel-btn" onclick="closeCtModal()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="aiScopeModeApply('+i+',\''+mode+'\')">Yes, Confirm</button>'
    +'</div></div>';
  document.getElementById('ct-modal-overlay').style.display='flex';
}
function aiScopeModeApply(i,mode){
  const seg=document.getElementById('ai-scope-mode-'+i);
  if(seg){
    [].slice.call(seg.querySelectorAll('.seg-btn')).forEach(function(b){b.classList.toggle('active',b.getAttribute('data-mode')===mode);});
  }
  closeCtModal();
}

function aiWizardStepperHTML(current){
  const visible=aiAutomateVisibleSteps();
  const posInVisible=visible.indexOf(current);
  return '<div class="ai-wizard-stepper">'
    +visible.map(function(idx,pos){
      const active=pos===posInVisible,done=pos<posInVisible;
      const circleContent=done?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':(pos+1);
      let html='<div class="ai-wizard-step'+(active?' active':'')+(done?' done':'')+'" onclick="aiAutomateGoStep('+idx+')">'
        +'<div class="ai-wizard-step-circle">'+circleContent+'</div>'
        +'<span class="ai-wizard-step-label">'+aiAutomateSteps[idx].label+'</span>'
        +'</div>';
      if(pos<visible.length-1)html+='<div class="ai-wizard-step-line'+(done?' done':'')+'"></div>';
      return html;
    }).join('')
    +'</div>';
}
function aiStepHeaderHTML(i){
  return '<div class="ai-wizard-step-header"><div class="ai-wizard-step-title">'+aiAutomateSteps[i].label+'</div><div class="ai-wizard-step-subtitle">'+aiAutomateSteps[i].desc+'</div></div>';
}
function aiOptsHTML(options,current){
  return options.map(function(o){return '<option'+(o===current?' selected':'')+'>'+o+'</option>';}).join('');
}

function aiSelectJourneyCard(el){
  const grid=el.parentElement;
  [].slice.call(grid.querySelectorAll('.ai-journey-pick-card')).forEach(function(c){c.classList.remove('selected');});
  el.classList.add('selected');
}
function aiWizardSelectJourneyHTML(){
  const current=selectedAIJourneyId||aiJourneys[0].id;
  const cards=aiJourneys.map(function(j){
    return '<div class="ai-journey-pick-card'+(j.id===current?' selected':'')+'" onclick="aiSelectJourneyCard(this)" data-journey-id="'+j.id+'">'
      +'<div class="ai-journey-pick-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>'
      +'<div class="ai-journey-pick-icon">'+j.icon+'</div>'
      +'<div class="ai-journey-pick-name">'+j.name+'</div>'
      +'<div class="ai-journey-pick-desc">'+j.desc+'</div>'
      +'<div class="ai-journey-pick-meta">'+j.modules.length+' modules &middot; '+j.coverage+'% automation coverage</div>'
      +'</div>';
  }).join('');
  return '<div class="ai-journey-grid" id="ai-journey-pick-grid">'+cards+'</div>';
}
function aiWizardBasicDetailsHTML(j){
  const d=aiAutomateFormData;
  const name=d.name!==undefined?d.name:(j.name+' Automation');
  const activeStatus=d.statusActive!==undefined?d.statusActive:(j.status==='Active');
  return '<div class="ep-form-card ai-wizard-form-card">'
    +'<div class="ep-form-grid ai-wizard-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Automation Name</label><input class="ep-form-input" id="ai-auto-name" value="'+name+'"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Journey Type</label><input class="ep-form-input" value="'+j.name+'" readonly style="background:var(--light);color:var(--gray)"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Entity</label><select class="ep-form-select" id="ai-auto-entity">'+aiOptsHTML(aiEntityOptions,d.entity)+'</select></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Country</label><select class="ep-form-select" id="ai-auto-country">'+aiOptsHTML(aiCountryOptions,d.country)+'</select></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employment Type</label><select class="ep-form-select" id="ai-auto-emp-type">'+aiOptsHTML(aiEmploymentTypeOptions,d.empType)+'</select></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Effective From Date</label>'+apCD('ai-auto-effective',d.effective||'','Select date')+'</div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Status</label>'
      +ciRadio('ai-auto-status',['Draft','Active'],activeStatus?'Active':'Draft')+'</div>'
    +'</div></div>';
}
function aiWizardTriggerHTML(){
  const current=aiAutomateFormData.trigger;
  const triggerCards=aiTriggerOptions.map(function(t,i){
    const isSel=current?t.title===current:i===0;
    return '<label class="choice-card'+(isSel?' selected':'')+'" onclick="selRadio(this)">'
      +'<input type="radio" name="ai-trigger"'+(isSel?' checked':'')+'>'
      +'<div class="choice-radio"></div>'
      +'<div class="choice-body"><div class="choice-title">'+t.title+'</div><div class="choice-desc">'+t.desc+'</div></div>'
      +'</label>';
  }).join('');
  return '<div class="ep-form-card"><div class="choice-grid" id="ai-trigger-grid">'+triggerCards+'</div></div>';
}
function aiWizardScopeHTML(events){
  const saved=aiAutomateFormData.scope;
  const scopeRows=events.map(function(e,i){
    const toggleable=aiEventIsToggleable(e);
    const d=(saved&&saved[i])?saved[i]:aiScopeDefaults(e);
    const mode=d.mode||(toggleable?'ai':'manual');
    const nameSafe=e.name.replace(/'/g,"\\'");
    if(!toggleable){
      return '<div class="ai-scope-row ai-scope-row-manual">'
        +'<div class="ai-scope-name"><div class="ai-scope-name-text">'+(i+1)+'. '+e.name+'</div><div class="ai-timeline-chips">'+aiChips(e.chips)+'</div></div>'
        +'<div class="ai-scope-manual-badge">Manual step &mdash; requires human action</div>'
        +'</div>';
    }
    return '<div class="ai-scope-row">'
      +'<div class="ai-scope-name"><div class="ai-scope-name-text">'+(i+1)+'. '+e.name+'</div><div class="ai-timeline-chips">'+aiChips(e.chips)+'</div></div>'
      +'<div class="segmented ai-scope-mode-seg" id="ai-scope-mode-'+i+'">'
      +'<button type="button" class="seg-btn'+(mode==='ai'?' active':'')+'" data-mode="ai" onclick="aiScopeModeChoose(this,'+i+',\'ai\',\''+nameSafe+'\')">AI</button>'
      +'<button type="button" class="seg-btn'+(mode==='manual'?' active':'')+'" data-mode="manual" onclick="aiScopeModeChoose(this,'+i+',\'manual\',\''+nameSafe+'\')">Manual</button>'
      +'</div>'
      +'</div>';
  }).join('');
  return '<div class="ep-form-card"><div class="ai-scope-table">'+scopeRows+'</div></div>';
}
function aiWizardApprovalsHTML(j){
  const d=aiAutomateFormData.approvals||{};
  return '<div class="ep-form-card">'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Who approves contract data?</label><select class="ep-form-select" id="ai-appr-contract-data">'+aiOptsHTML(['OpenDHI Admin','Payroll Admin','Compliance Officer','Finance Admin'],d.contractData)+'</select></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Who approves sending contract?</label><select class="ep-form-select" id="ai-appr-send-contract">'+aiOptsHTML(['OpenDHI Admin','Sales Manager'],d.sendContract)+'</select></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Who approves document exceptions?</label><select class="ep-form-select" id="ai-appr-doc-exceptions">'+aiOptsHTML(['Compliance Officer','Onboarding Admin'],d.docExceptions)+'</select></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Who confirms Ready for Payroll?</label><select class="ep-form-select" id="ai-appr-ready-payroll">'+aiOptsHTML(['Payroll Admin','Finance Admin'],d.readyPayroll)+'</select></div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Approval threshold / risk setting</label><select class="ep-form-select" id="ai-appr-risk-threshold" style="max-width:240px">'+aiOptsHTML(['Low','Medium','High'],d.riskThreshold||j.risk)+'</select></div>'
    +'</div></div>';
}
function aiWizardValidationHTML(){
  const saved=aiAutomateFormData.validation;
  return '<div class="ep-form-card">'
    +aiValidationChecklist.map(function(v,i){
      const checked=saved?!!saved[i]:true;
      return '<div class="cs-toggle-row"><span class="cs-toggle-label">'+v+'</span><label class="cs-toggle"><input type="checkbox" id="ai-val-'+i+'"'+(checked?' checked':'')+'><span class="cs-toggle-slider"></span></label></div>';
    }).join('')
    +'</div>';
}
function aiWizardReviewHTML(j,events){
  const d=aiAutomateFormData;
  const scope=d.scope||events.map(function(e){return aiScopeDefaults(e);});
  const aiCount=scope.filter(function(s){return s.mode==='ai';}).length;
  const humanCount=scope.filter(function(s){return s.mode==='manual';}).length;
  const approvals=d.approvals||{};
  const validation=d.validation||aiValidationChecklist.map(function(){return true;});
  const validationOnCount=validation.filter(Boolean).length;
  const summaryRows=aiDrawerRow('Automation Name',d.name||(j.name+' Automation'))
    +aiDrawerRow('Journey',j.name)
    +aiDrawerRow('Entity',d.entity||aiEntityOptions[0])
    +aiDrawerRow('Country',d.country||aiCountryOptions[0])
    +aiDrawerRow('Employment Type',d.empType||aiEmploymentTypeOptions[0])
    +aiDrawerRow('Trigger',d.trigger||aiTriggerOptions[0].title)
    +aiDrawerRow('Automation Scope',aiCount+' of '+events.length+' events AI automated, '+humanCount+' need human approval')
    +aiDrawerRow('Approvals',(approvals.contractData||'—')+' &middot; '+(approvals.sendContract||'—')+' &middot; '+(approvals.docExceptions||'—')+' &middot; '+(approvals.readyPayroll||'—'))
    +aiDrawerRow('Data Validation',validationOnCount+' of '+aiValidationChecklist.length+' checks enabled')
    +aiDrawerRow('Connected Modules',j.modules.join(', '));
  return '<div class="ep-form-card"><div class="review-grid" style="grid-template-columns:1fr">'+summaryRows+'</div></div>';
}

function buildAutomateJourneyFormHTML(){
  const j=aiJourneys.find(x=>x.id===selectedAIJourneyId)||aiJourneys[0];
  const events=aiJourneyEvents[j.id]||[];
  const step=aiAutomateStep;
  const stepFns=[
    function(){return aiWizardSelectJourneyHTML();},
    function(){return aiWizardBasicDetailsHTML(j);},
    function(){return aiWizardTriggerHTML();},
    function(){return aiWizardScopeHTML(events);},
    function(){return aiWizardApprovalsHTML(j);},
    function(){return aiWizardValidationHTML();},
    function(){return aiWizardReviewHTML(j,events);}
  ];
  const visible=aiAutomateVisibleSteps();
  const posInVisible=visible.indexOf(step);
  const isFirst=posInVisible===0;
  const isLast=posInVisible===visible.length-1;
  const footer='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:22px 2px 4px;border-top:1px solid var(--border);margin-top:22px">'
    +'<button class="btn btn-secondary" onclick="'+(isFirst?'cancelAIAutomation()':'aiAutomateBack()')+'">'+(isFirst?'Cancel':'Back')+'</button>'
    +'<div style="display:flex;gap:10px">'
    +(isLast
      ?'<button class="btn btn-secondary" onclick="saveAIAutomation(\'draft\')">Save as Draft</button><button class="btn btn-success" onclick="saveAIAutomation(\'active\')">Activate Automation</button>'
      :'<button class="btn btn-primary" onclick="aiAutomateNext()">Next</button>')
    +'</div></div>';

  return '<div class="ai-exec-page">'
    +'<button class="ep-cancel-btn" style="margin-bottom:14px" onclick="cancelAIAutomation()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg> '+(aiAutomateSkipPicker?'Back to '+j.name:'All Journeys')+'</button>'
    +'<p style="font-size:17px;font-weight:700;margin-bottom:6px">Create Your Journey</p>'
    +'<p style="font-size:12.5px;color:var(--gray);line-height:1.6;margin-bottom:26px">Configure AI automation for <strong style="color:var(--navy)">'+j.name+'</strong> in a few guided steps.</p>'
    +aiWizardStepperHTML(step)
    +aiStepHeaderHTML(step)
    +'<div class="ai-wizard-step-body">'+stepFns[step]()+'</div>'
    +footer
    +'</div>';
}

function aiAutomateCaptureStep(){
  const gv=function(id){const el=document.getElementById(id);return el?el.value:undefined;};
  const gc=function(id){const el=document.getElementById(id);return el?el.checked:undefined;};
  const j=aiJourneys.find(x=>x.id===selectedAIJourneyId)||aiJourneys[0];
  const events=aiJourneyEvents[j.id]||[];
  if(aiAutomateStep===0){
    const sel=document.querySelector('#ai-journey-pick-grid .ai-journey-pick-card.selected');
    if(sel&&sel.getAttribute('data-journey-id'))selectedAIJourneyId=sel.getAttribute('data-journey-id');
  }else if(aiAutomateStep===1){
    aiAutomateFormData.name=gv('ai-auto-name');
    aiAutomateFormData.entity=gv('ai-auto-entity');
    aiAutomateFormData.country=gv('ai-auto-country');
    aiAutomateFormData.empType=gv('ai-auto-emp-type');
    aiAutomateFormData.effective=gv('ai-auto-effective');
    aiAutomateFormData.statusActive=ciPicked('ai-auto-status','Draft')==='Active';
  }else if(aiAutomateStep===2){
    const sel=document.querySelector('#ai-trigger-grid .choice-card.selected .choice-title');
    if(sel)aiAutomateFormData.trigger=sel.textContent;
  }else if(aiAutomateStep===3){
    aiAutomateFormData.scope=events.map(function(e,i){
      if(!aiEventIsToggleable(e))return {mode:'manual'};
      const seg=document.getElementById('ai-scope-mode-'+i);
      const activeBtn=seg?seg.querySelector('.seg-btn.active'):null;
      const mode=(activeBtn&&activeBtn.getAttribute('data-mode'))||'ai';
      return {mode:mode};
    });
  }else if(aiAutomateStep===4){
    aiAutomateFormData.approvals={
      contractData:gv('ai-appr-contract-data'),sendContract:gv('ai-appr-send-contract'),
      docExceptions:gv('ai-appr-doc-exceptions'),readyPayroll:gv('ai-appr-ready-payroll'),
      riskThreshold:gv('ai-appr-risk-threshold')
    };
  }else if(aiAutomateStep===5){
    aiAutomateFormData.validation=aiValidationChecklist.map(function(v,i){return !!gc('ai-val-'+i);});
  }
}
function aiAutomateNext(){
  const prevJourneyId=selectedAIJourneyId;
  aiAutomateCaptureStep();
  if(aiAutomateStep===0){
    const pickedId=selectedAIJourneyId||aiJourneys[0].id;
    selectedAIJourneyId=pickedId;
    if(pickedId!==prevJourneyId)aiAutomateResumeOrStart(pickedId);
    else aiAutomateStep=1;
    navigatePage('ai-automate-form');
    return;
  }
  const visible=aiAutomateVisibleSteps();
  const pos=visible.indexOf(aiAutomateStep);
  aiAutomateStep=visible[Math.min(visible.length-1,pos+1)];
  navigatePage('ai-automate-form');
}
function aiAutomateBack(){
  aiAutomateCaptureStep();
  const visible=aiAutomateVisibleSteps();
  const pos=visible.indexOf(aiAutomateStep);
  aiAutomateStep=visible[Math.max(0,pos-1)];
  navigatePage('ai-automate-form');
}
function aiAutomateGoStep(i){aiAutomateCaptureStep();aiAutomateStep=i;navigatePage('ai-automate-form');}

function saveAIAutomation(mode){
  aiAutomateCaptureStep();
  const j=aiJourneys.find(x=>x.id===selectedAIJourneyId);if(!j)return;
  const events=aiJourneyEvents[j.id]||[];
  const d=aiAutomateFormData;
  const scope=(d.scope||events.map(function(e){return aiScopeDefaults(e);})).map(function(s,i){
    return {name:events[i]?events[i].name:'',mode:s.mode};
  });
  aiAutomationConfigs[j.id]={
    name:d.name||(j.name+' Automation'),entity:d.entity||aiEntityOptions[0],country:d.country||aiCountryOptions[0],employmentType:d.empType||aiEmploymentTypeOptions[0],
    effectiveFrom:d.effective||'',trigger:d.trigger||aiTriggerOptions[0].title,scope:scope,status:mode==='active'?'Active':'Draft'
  };
  j.status=mode==='active'?'Active':'Draft';
  if(mode==='active'){delete aiAutomateProgress[j.id];}
  else{aiAutomateProgress[j.id]={step:aiAutomateStep,formData:Object.assign({},d)};}
  aiAutomateStep=0;aiAutomateFormData={};aiAutomateSkipPicker=false;
  const col=document.getElementById('adt-content');
  if(col)col.innerHTML='<div class="contract-loader"><div class="cl-spinner"></div><div class="cl-title">'+(mode==='active'?'Activating Automation…':'Saving Draft…')+'</div><div class="cl-sub">'+j.name+'</div></div>';
  setTimeout(function(){navigatePage('ai-executive');},1400);
}
function cancelAIAutomation(){
  aiAutomateSaveProgress();
  const dest=aiAutomateSkipPicker?'ai-journey-detail':'ai-executive';
  aiAutomateStep=0;aiAutomateFormData={};aiAutomateSkipPicker=false;
  navigatePage(dest);
}

// -- AI Executive: live run flows for activated journeys (Create Employee / Run Payroll) --
function aiJourneyCTA(j){
  if(j.id==='contract-creation')return {label:'Create Contract',action:"addListingItem('contracts')"};
  if(aiRunFlows[j.id])return {label:aiRunFlows[j.id].entryLabel,action:"startAIJourneyRun('"+j.id+"')"};
  return null;
}
function startAIJourneyRun(journeyId){
  aiRunFlowJourneyId=journeyId;aiRunFlowStep=-1;aiRunFlowData={};
  if(journeyId==='payroll-creation'){aiPayrollData={};aiPayrollAnimatedStage=-1;}
  navigatePage('ai-journey-run');
}
function aiRunFlowExit(){
  aiRunFlowJourneyId=null;aiRunFlowStep=-1;aiRunFlowData={};
  navigatePage('ai-executive');
}
function aiRunFlowRestart(){aiRunFlowStep=-1;aiRunFlowData={};if(aiRunFlowJourneyId==='payroll-creation'){aiPayrollData={};aiPayrollAnimatedStage=-1;}navigatePage('ai-journey-run');}
function parseAIRunPrompt(text){
  const countries=['Netherlands','India','Germany','Spain','United Kingdom','France','Italy'];
  let country='',raw=text||'';
  countries.forEach(function(c){if(new RegExp('\\b'+c+'\\b','i').test(raw)){country=c;raw=raw.replace(new RegExp('\\b'+c+'\\b','i'),'');}});
  const asMatch=raw.match(/\bas\s+(.+)$/i);
  const role=asMatch?asMatch[1].trim():'';
  if(asMatch)raw=raw.slice(0,asMatch.index);
  const name=raw.replace(/\b(create|an|a|for|in|the|please|make|start|new|employee|record|run|payroll|this|month|onboard)\b/gi,'').replace(/[,]/g,' ').replace(/\s+/g,' ').trim();
  return {name:name,country:country,role:role};
}
function findExistingEmployeeByQuery(query){
  const q=String(query||'').toLowerCase().trim();if(!q)return null;
  const all=directEmpData.concat(globalEmpData);
  return all.find(function(e){return String(e.empId||'').toLowerCase()===q;})
    || findExistingEmployee(q);
}
function aiRunFlowSubmit(){
  const inp=document.getElementById('ai-run-prompt');if(!inp)return;
  if(aiRunFlowJourneyId==='payroll-creation'){aiPayrollRunSearch(inp.value);return;}
  const parsed=parseAIRunPrompt(inp.value);
  const emp=findExistingEmployee(parsed.name);
  aiRunFlowData={
    name:parsed.name||(emp&&emp.name)||'New Employee',
    country:parsed.country||(emp&&emp.country)||'India',
    role:parsed.role||(emp&&emp.jobTitle)||'',
    employee:emp,
    amount:38000+Math.floor(Math.random()*22000)
  };
  aiRunFlowStep=0;
  navigatePage('ai-journey-run');
  aiRunFlowRunCurrentStep();
}
function aiRunFlowRunCurrentStep(){
  const flow=aiRunFlows[aiRunFlowJourneyId];if(!flow)return;
  const step=flow.steps[aiRunFlowStep];if(!step)return;
  if(aiRunFlowJourneyId==='payroll-creation'&&step.type==='slip')return;
  if(step.type==='ai'||step.type==='auto-skip'){
    setTimeout(function(){
      aiRunFlowStep++;
      navigatePage('ai-journey-run');
      aiRunFlowRunCurrentStep();
    },step.type==='auto-skip'?600:1100);
  }
}
function aiRunFlowApprove(){
  aiRunFlowStep++;
  navigatePage('ai-journey-run');
  aiRunFlowRunCurrentStep();
}
function aiPayrollCreateSlip(){
  const col=aiCtLoaderTarget();
  if(col)col.innerHTML='<div class="contract-loader"><div class="cl-spinner"></div><div class="cl-title">Creating Salary Slip&hellip;</div><div class="cl-sub">Saving payroll document for '+(aiPayrollData.name||'employee')+'</div></div>';
  setTimeout(function(){aiRunFlowStep=5;navigatePage('ai-journey-run');},1200);
}
function aiRunFlowFinish(){
  aiRunFlowStep++;
  navigatePage('ai-journey-run');
}
function buildAIJourneyRunHTML(){
  const flow=aiRunFlows[aiRunFlowJourneyId];
  const j=aiJourneys.find(x=>x.id===aiRunFlowJourneyId)||aiJourneys[0];
  if(!flow)return '<div class="ai-exec-page">Unknown automation.</div>';
  if(aiRunFlowJourneyId==='payroll-creation')return buildAIPayrollJourneyHTML(flow,j);
  if(aiRunFlowStep===-1)return buildAIRunPromptHTML(flow,j);
  const cur=aiRunFlowStep;
  const timeline=buildAIRunTimelineHTML(flow,cur);
  let trailing='';
  if(cur<flow.steps.length){
    if(flow.steps[cur].type==='payment')trailing=buildAIRunPaymentPanelHTML(j);
  }else{
    trailing=buildAIRunCompletionPanelHTML(flow,j);
  }
  return '<div class="ep-page" style="max-width:640px;margin:0 auto">'
    +'<button class="ep-back" onclick="aiRunFlowExit()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to AI Executive</button>'
    +'<div style="font-size:16px;font-weight:700;color:var(--navy);margin:14px 0 2px">'+flow.entryLabel+'</div>'
    +'<div style="font-size:12px;color:var(--gray);margin-bottom:18px">For <strong style="color:var(--navy)">'+aiRunFlowData.name+'</strong>'+(aiRunFlowData.role?' &middot; '+aiRunFlowData.role:'')+(aiRunFlowData.country?' &middot; '+aiRunFlowData.country:'')+'</div>'
    +'<div class="ai-timeline">'+timeline+'</div>'
    +trailing
    +'</div>';
}
function buildAIPayrollJourneyHTML(flow,j){
  if(aiRunFlowStep===-1)return buildAIPayrollPromptHTML(flow,j);
  const stage=Math.max(0,Math.min(aiRunFlowStep,5));
  return '<div class="aicj-wrap">'
    +buildAIJourneyBarHTML('payroll-creation',stage,'payroll')
    +'<div id="aicj-inner">'+buildAIPayrollStageHTML(flow,j)+'</div>'
    +'</div>';
}
function buildAIPayrollPromptHTML(flow,j){
  return '<div class="aicj-wrap">'
    +buildAIJourneyBarHTML('payroll-creation',0,'payroll')
    +'<div id="aicj-inner"><div class="ep-page" style="max-width:620px;margin:0 auto">'
    +'<button class="ep-back" onclick="aiRunFlowExit()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to AI Executive</button>'
    +'<div class="ep-form-card" style="margin-top:20px;text-align:center;padding:38px 36px">'
    +'<div class="we-icon">'+j.icon+'</div>'
    +'<div style="font-size:18px;font-weight:700;color:var(--navy);margin-bottom:6px">AI Payroll Assistant</div>'
    +'<div style="font-size:12.5px;color:var(--gray);line-height:1.6;margin:0 auto 22px;max-width:440px">The Payroll Creation journey is automated. Enter the employee name or ID, and I\'ll fetch the employee record before capturing attendance and calculating salary.</div>'
    +'<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:18px">'
    +'<button class="btn btn-secondary" onclick="aiPayrollSimulateExisting()">Simulate: Existing Employee</button>'
    +'<button class="btn btn-secondary" onclick="aiPayrollSimulateById()">Simulate: Employee ID</button>'
    +'</div>'
    +'<div class="input-row" style="margin:0 auto 10px;max-width:440px">'
    +'<input class="input-field" id="ai-run-prompt" placeholder="'+flow.promptPlaceholder+'" onkeydown="if(event.key===\'Enter\')aiRunFlowSubmit()">'
    +'<button class="icon-btn active" onclick="aiRunFlowSubmit()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'
    +'</div>'
    +'</div><div id="ai-payroll-result" style="margin-top:20px"></div>'
    +'</div></div></div>';
}
function aiPayrollSimulateExisting(){
  const inp=document.getElementById('ai-run-prompt');if(inp)inp.value='Run payroll for Anika Shah for June 2026';
  aiPayrollRunSearch(inp?inp.value:'Anika Shah');
}
function aiPayrollSimulateById(){
  const inp=document.getElementById('ai-run-prompt');if(inp)inp.value='Run payroll for EMP001';
  aiPayrollRunSearch(inp?inp.value:'EMP001');
}
function aiPayrollRunSearch(text){
  const parsed=parseAIRunPrompt(text);
  const query=parsed.name||text;
  const res=document.getElementById('ai-payroll-result');if(!res)return;
  res.innerHTML='<div class="ep-form-card" style="display:flex;align-items:center;gap:12px"><div class="cl-spinner" style="width:22px;height:22px;border-width:2.5px"></div><span style="font-size:13px;color:var(--navy);font-weight:500">Searching ADT employee records for &ldquo;'+query+'&rdquo;&hellip;</span></div>';
  setTimeout(function(){
    const emp=findExistingEmployeeByQuery(query);
    if(emp)aiPayrollRenderMatchCard(emp,parsed);
    else res.innerHTML='<div class="ep-form-card"><div style="font-size:11.5px;font-weight:700;color:#b83a3a;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">No employee found</div><div style="font-size:12px;color:var(--gray)">Please enter a valid employee name or ID to run payroll.</div></div>';
  },900);
}
function aiPayrollMockBase(emp){
  const s=parseInt(String(aiCtMockSalary(emp)).replace(/,/g,''),10)||52000;
  return Math.max(38000,s);
}
function aiPayrollBuildData(emp,parsed){
  const base=aiPayrollMockBase(emp);
  const daysPresent=22,leaveDays=2,overtimeHours=6,totalDays=24;
  const attendancePay=Math.round(base*(daysPresent/totalDays));
  const overtime=Math.round((base/176)*overtimeHours*1.25);
  const gross=attendancePay+overtime;
  const pf=Math.round(gross*0.12),pt=200,esi=Math.round(gross*0.0075),tax=Math.round(gross*0.05);
  const deductions=pf+pt+esi+tax;
  return {employee:emp,name:emp.name,empId:emp.empId,country:emp.country||parsed.country||'India',role:emp.jobTitle||parsed.role||'Employee',dept:emp.dept||'—',email:emp.email||'—',period:'June 2026',slipId:'PAY-'+Math.floor(10000+Math.random()*89999),base:base,daysPresent:daysPresent,leaveDays:leaveDays,overtimeHours:overtimeHours,totalDays:totalDays,gross:gross,pf:pf,pt:pt,esi:esi,tax:tax,deductions:deductions,net:gross-deductions};
}
function aiPayrollRenderMatchCard(emp,parsed){
  const res=document.getElementById('ai-payroll-result');if(!res)return;
  const initials=emp.name.split(' ').map(function(n){return n[0];}).slice(0,2).join('');
  res.innerHTML='<div class="ep-form-card">'
    +'<div style="font-size:11.5px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.4px;margin-bottom:12px">&#10003; Employee fetched from ADT</div>'
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
    +'<div class="user-avatar-sm" style="width:40px;height:40px;font-size:14px">'+initials+'</div>'
    +'<div><div style="font-size:14px;font-weight:700;color:var(--navy)">'+emp.name+'</div><div style="font-size:12px;color:var(--gray)">'+(emp.jobTitle||'—')+' &middot; '+(emp.dept||'—')+'</div></div>'
    +'</div>'
    +'<div class="review-grid">'
    +'<div class="review-row"><div class="rr-label">Employee ID</div><div class="rr-val">'+(emp.empId||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Country</div><div class="rr-val">'+(emp.country||parsed.country||'India')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Email</div><div class="rr-val">'+(emp.email||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Status</div><div class="rr-val">'+(emp.status||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Pay Period</div><div class="rr-val">June 2026</div></div>'
    +'<div class="review-row"><div class="rr-label">Monthly Salary</div><div class="rr-val">&#8377; '+aiCtMockSalary(emp)+'</div></div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;margin-top:18px">'
    +'<button class="btn btn-primary" onclick="aiPayrollUseEmployee(\''+emp.empId+'\')">Use this employee &amp; continue</button>'
    +'<button class="btn btn-secondary" onclick="document.getElementById(\'ai-payroll-result\').innerHTML=\'\'">Search again</button>'
    +'</div></div>';
}
function aiPayrollUseEmployee(empId){
  const emp=directEmpData.concat(globalEmpData).find(function(e){return String(e.empId)===String(empId);});if(!emp)return;
  const inp=document.getElementById('ai-run-prompt');
  const parsed=parseAIRunPrompt(inp?inp.value:emp.name);
  aiPayrollData=aiPayrollBuildData(emp,parsed);
  aiRunFlowData=Object.assign({},aiPayrollData,{amount:aiPayrollData.net});
  aiRunFlowStep=1;
  navigatePage('ai-journey-run');
  aiRunFlowRunCurrentStep();
}
function buildAIPayrollStageHTML(flow,j){
  const d=aiPayrollData||{};
  if(aiRunFlowStep===3)return buildAIPayrollApprovalHTML();
  if(aiRunFlowStep===4)return buildAIPayrollSlipHTML();
  if(aiRunFlowStep>=5)return buildAIPayrollCompleteHTML();
  return '<div class="ep-page" style="max-width:640px;margin:0 auto">'
    +'<button class="ep-back" onclick="aiRunFlowExit()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to AI Executive</button>'
    +'<div style="font-size:16px;font-weight:700;color:var(--navy);margin:14px 0 2px">Run Payroll</div>'
    +'<div style="font-size:12px;color:var(--gray);margin-bottom:18px">For <strong style="color:var(--navy)">'+(d.name||'Employee')+'</strong> &middot; '+(d.period||'June 2026')+'</div>'
    +'<div class="ai-timeline">'+buildAIRunTimelineHTML(flow,aiRunFlowStep)+'</div>'
    +'</div>';
}
function buildAIPayrollApprovalHTML(){
  const d=aiPayrollData||{};
  return buildAIWaitingApprovalHTML({
    description:'We\'ve notified <strong style="color:var(--navy)">'+aiPayrollManager.name+'</strong> (Finance Approver) to review the calculated payroll for <strong>'+(d.name||'the employee')+'</strong>. Once approved, this journey will automatically continue to salary slip generation.',
    timelineItems:[
      {label:'Attendance Captured',dotClass:'ai',chips:[{cls:'ai-chip-ai',label:'AI Automated'}]},
      {label:'Salary Calculated',dotClass:'ai',chips:[{cls:'ai-chip-ai',label:'AI Automated'}]},
      {label:'Waiting for '+aiPayrollManager.name+'\'s Approval',dotClass:'human',chips:[{cls:'ai-chip-human',label:'Human Required'},{cls:'ai-chip-approval',label:'Approval Required'}]},
      {label:'Salary Slip Template (pending)',dotClass:'system',chips:[{cls:'ai-chip-system',label:'System Action'}],pending:true}
    ],
    onApprove:'aiRunFlowApprove()',
    approveLabel:'Simulate: '+aiPayrollManager.name+' Approves',
    backLabel:'Back to AI Executive',
    backAction:'aiRunFlowExit()'
  });
}
function aiMoney(v){return '&#8377; '+Math.round(v||0).toLocaleString('en-IN');}
function buildAIPayrollSlipHTML(){
  const d=aiPayrollData||{};const now=aiFormatNow();
  return '<div style="padding:8px 0 24px">'
    +'<div class="adt-doc-page">'
    +'<div class="adt-doc-header">'
    +'<div><div class="adt-doc-brand">ADT</div><div class="adt-doc-brand-sub">Payroll Services</div></div>'
    +'<div><div class="adt-doc-title">SALARY SLIP</div><div class="adt-doc-meta">Slip No. '+(d.slipId||'—')+'<br>Pay Period '+(d.period||'—')+'</div></div>'
    +'</div>'
    +'<div class="adt-doc-section"><div class="adt-doc-section-title">Employee Details</div><div class="review-grid">'
    +'<div class="review-row"><div class="rr-label">Employee</div><div class="rr-val">'+(d.name||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Employee ID</div><div class="rr-val">'+(d.empId||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Department</div><div class="rr-val">'+(d.dept||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Job Title</div><div class="rr-val">'+(d.role||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Country</div><div class="rr-val">'+(d.country||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Issue Date</div><div class="rr-val">'+now.date+'</div></div>'
    +'</div></div>'
    +'<div class="adt-doc-section"><div class="adt-doc-section-title">Attendance Capture</div><div class="review-grid">'
    +'<div class="review-row"><div class="rr-label">Total Payable Days</div><div class="rr-val">'+(d.totalDays||0)+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Days Present</div><div class="rr-val">'+(d.daysPresent||0)+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Leave Days</div><div class="rr-val">'+(d.leaveDays||0)+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Overtime Hours</div><div class="rr-val">'+(d.overtimeHours||0)+'</div></div>'
    +'</div></div>'
    +'<div class="adt-doc-section"><div class="adt-doc-section-title">Salary &amp; Compliance</div><div class="review-grid">'
    +'<div class="review-row"><div class="rr-label">Gross Salary</div><div class="rr-val">'+aiMoney(d.gross)+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Provident Fund</div><div class="rr-val">'+aiMoney(d.pf)+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Professional Tax</div><div class="rr-val">'+aiMoney(d.pt)+'</div></div>'
    +'<div class="review-row"><div class="rr-label">ESI</div><div class="rr-val">'+aiMoney(d.esi)+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Income Tax</div><div class="rr-val">'+aiMoney(d.tax)+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Net Pay</div><div class="rr-val">'+aiMoney(d.net)+'</div></div>'
    +'</div></div>'
    +'<div class="adt-doc-section"><div class="adt-doc-section-title">Approval</div><p class="adt-doc-clause">Payroll calculation approved by '+aiPayrollManager.name+' and generated from attendance, payhead, and compliance inputs.</p></div>'
    +'</div>'
    +'<div style="text-align:center;margin-top:22px"><button class="btn btn-success" onclick="aiPayrollCreateSlip()">Create Salary Slip</button></div>'
    +'</div>';
}
function buildAIPayrollCompleteHTML(){
  const d=aiPayrollData||{};
  return '<div class="ep-page" style="max-width:640px;margin:20px auto 0">'
    +'<div class="success-card">'
    +'<div class="success-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>'
    +'<h2 style="font-size:20px;font-weight:700;margin-bottom:6px">Salary Slip Created</h2>'
    +'<p style="font-size:12.5px;color:var(--gray);margin-bottom:22px;max-width:420px;line-height:1.55">The salary slip for '+(d.name||'the employee')+' has been created and saved for '+(d.period||'the selected pay period')+'.</p>'
    +'<div style="text-align:left;width:100%;max-width:460px">'
    +'<div class="review-section"><div class="review-title">Employee Details</div><div class="review-grid" style="grid-template-columns:1fr">'+aiDrawerRow('Name',d.name||'—')+aiDrawerRow('Employee ID',d.empId||'—')+aiDrawerRow('Country',d.country||'—')+aiDrawerRow('Job Title',d.role||'—')+'</div></div>'
    +'<div class="review-section"><div class="review-title">Salary Slip Details</div><div class="review-grid" style="grid-template-columns:1fr">'+aiDrawerRow('Salary Slip ID',d.slipId||'—')+aiDrawerRow('Pay Period',d.period||'—')+aiDrawerRow('Net Pay',aiMoney(d.net))+aiDrawerRow('Status','Created')+'</div></div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;margin-top:6px">'
    +'<button class="btn btn-secondary" onclick="navigatePage(\'payroll\')">View Payroll</button>'
    +'<button class="btn btn-primary" onclick="aiRunFlowRestart()">Run Another</button>'
    +'</div></div></div>';
}
function buildAIRunPromptHTML(flow,j){
  return '<div class="ep-page" style="max-width:560px;margin:30px auto 0">'
    +'<button class="ep-back" onclick="aiRunFlowExit()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to AI Executive</button>'
    +'<div style="margin-top:22px">'
    +'<div class="ai-run-icon-wrap">'+j.icon+'</div>'
    +'<div style="font-size:18px;font-weight:700;color:var(--navy);margin-bottom:6px">'+flow.entryLabel+'</div>'
    +'<div style="font-size:12.5px;color:var(--gray);line-height:1.6;margin-bottom:18px">'+flow.entryDesc+'</div>'
    +'<div class="input-row" style="margin:0;max-width:480px">'
    +'<input class="input-field" id="ai-run-prompt" placeholder="'+flow.promptPlaceholder+'" onkeydown="if(event.key===\'Enter\')aiRunFlowSubmit()">'
    +'<button class="icon-btn active" onclick="aiRunFlowSubmit()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'
    +'</div>'
    +'</div></div>';
}
function buildAIRunTimelineHTML(flow,cur){
  return flow.steps.map(function(step,i){
    let dotClass,body;
    if(i<cur){
      dotClass='run-done';
      body='<div class="ai-timeline-card-desc">'+(step.skipNote||'Completed')+'</div>';
    }else if(i===cur){
      dotClass='run-current';
      if(step.type==='manual'){
        body='<div class="ai-timeline-card-desc">'+step.running+'</div><button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="aiRunFlowApprove()">Approve &amp; Continue</button>';
      }else if(step.type==='payment'){
        body='<div class="ai-timeline-card-desc">'+step.running+'</div>';
      }else{
        body='<div class="ai-timeline-card-desc" style="display:flex;align-items:center;gap:8px"><span class="cl-spinner" style="width:13px;height:13px;border-width:2px"></span>'+step.running+'</div>';
      }
    }else{
      dotClass='run-pending';
      body='<div class="ai-timeline-card-desc" style="color:#cbd5e1">Waiting&hellip;</div>';
    }
    return '<div class="ai-timeline-item">'
      +'<div class="ai-timeline-dot '+dotClass+'">'+(i<cur?'&#10003;':(i+1))+'</div>'
      +'<div class="ai-timeline-card" style="cursor:default">'
      +'<div class="ai-timeline-card-head"><span class="ai-timeline-card-title">'+step.label+'</span></div>'
      +body
      +'</div></div>';
  }).join('');
}
function buildAIRunPaymentPanelHTML(j){
  const amt=aiRunFlowData.amount||42000;
  const masked='•••• •••• •••• '+(4000+Math.floor(Math.random()*999));
  return '<div class="ai-run-payment-panel">'
    +'<div class="ai-run-card">'
    +'<div class="ai-run-card-top"><span class="ai-run-card-bank">RBL BANK</span><div class="ai-run-card-chip"></div></div>'
    +'<div class="ai-run-card-number">'+masked+'</div>'
    +'<div class="ai-run-card-bottom"><div><div class="ai-run-card-label">Card Holder</div><div class="ai-run-card-name">'+aiRunFlowData.name.toUpperCase()+'</div></div><div class="ai-run-card-visa">VISA</div></div>'
    +'</div>'
    +'<div style="font-size:12px;color:var(--gray);margin-bottom:6px">Disbursing salary to</div>'
    +'<div style="font-size:24px;font-weight:800;color:var(--navy);margin-bottom:18px">&#8377;'+amt.toLocaleString('en-IN')+'</div>'
    +'<button class="btn btn-success" onclick="aiRunFlowFinish()">Confirm Payment</button>'
    +'</div>';
}
function buildAIRunCompletionPanelHTML(flow,j){
  const isPayment=aiRunFlowJourneyId==='payroll-creation';
  const title=isPayment?'Payment Successful':'Employee Onboarded';
  const sub=isPayment
    ?'&#8377;'+(aiRunFlowData.amount||0).toLocaleString('en-IN')+' has been paid to '+aiRunFlowData.name+'.'
    :aiRunFlowData.name+' has been created and set up for '+(aiRunFlowData.country||'their country')+'.';
  return '<div class="ep-form-card" style="text-align:center;padding:32px 24px;margin-top:20px">'
    +'<div class="success-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>'
    +'<div style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:6px">'+title+'</div>'
    +'<div style="font-size:12.5px;color:var(--gray);line-height:1.6;margin-bottom:20px">'+sub+'</div>'
    +'<div style="display:flex;justify-content:center;gap:10px">'
    +'<button class="btn btn-secondary" onclick="aiRunFlowExit()">Back to AI Executive</button>'
    +'<button class="btn btn-primary" onclick="aiRunFlowRestart()">'+(isPayment?'Run Another':'Create Another')+'</button>'
    +'</div></div>';
}

// -- AI CONTRACT ASSISTANT (Contracts "+" flow, gated on the contract-creation journey being Active) --
// -- Contract Creation Journey: persistent animated step bar (bound to aiJourneyEvents['contract-creation']) --
function aiCtJourneyStage(){
  if(page==='ai-contract-assistant')return 0;
  if(page==='ai-employee-created')return 0;
  if((page==='contract-type-select'||page==='contract-eor'||page==='contract-peo')&&aiAssistedFlow)return 1;
  if(page==='ai-proposal-created')return 1;
  if(page==='ai-proposal-waiting-approval')return 2;
  if(page==='ai-contract-document')return 3;
  if(page==='ai-contract-waiting-approval')return 4;
  if(page==='ai-onboarding-run')return 5;
  if(page==='ai-journey-complete')return 6;
  return -1;
}
function isAIContractWizardPage(pg){
  return pg==='ai-contract-assistant'||pg==='ai-employee-created'||pg==='contract-type-select'||pg==='contract-eor'||pg==='contract-peo'||pg==='ai-proposal-created'||pg==='ai-proposal-waiting-approval'||pg==='ai-contract-document'||pg==='ai-contract-waiting-approval'||pg==='ai-onboarding-run'||pg==='ai-journey-complete';
}
function aiCjShortLabel(name){return (name||'').replace(/\s*\([^)]*\)/g,'').trim();}
function aiAgentBadgeHTML(sourceName){
  const agent=findCfgAgentByName(sourceName);
  if(!agent)return '';
  return '<span class="aicj-agent-badge" onclick="viewCfgAgentSkillByName(\''+agent.name.replace(/'/g,"\\'")+'\')">&#10024; Handled by '+agent.name+'</span>';
}
function aiCtCurrentAgentBadge(){
  const events=aiJourneyEvents['contract-creation']||[];
  const current=events[aiCtJourneyStage()];
  return aiAgentBadgeHTML(current&&current.source);
}
function buildAIJourneyBarHTML(journeyId,stage,animationKey){
  const events=aiJourneyEvents[journeyId]||[];
  const prev=animationKey==='payroll'?aiPayrollAnimatedStage:aiCtAnimatedStage;
  const animateThisRender=stage>prev;
  if(animationKey==='payroll'){if(animateThisRender)aiPayrollAnimatedStage=stage;}
  else if(animateThisRender){aiCtAnimatedStage=stage;}
  const current=events[stage];
  const label=current?(
    '<div class="aicj-label">'
    +'<span class="aicj-label-step">Step '+(stage+1)+' of '+events.length+'</span>'
    +'<span class="aicj-label-name">'+current.name+'</span>'
    +aiChipsCompact(current.chips)
    +aiAgentBadgeHTML(current.source)
    +'</div>'
  ):'';
  return label+'<div class="aicj-bar">'+events.map(function(e,i){
    const state=i<stage?'done':i===stage?'current':'pending';
    let html='<div class="aicj-step">'
      +'<div class="aicj-dot '+state+'"></div>'
      +'<div class="aicj-step-label '+state+'">'+aiCjShortLabel(e.name)+'</div>'
      +'</div>';
    if(i<events.length-1){
      const filled=i<stage;
      const grow=filled&&i===stage-1&&animateThisRender;
      html+='<div class="aicj-line'+(filled?' filled':'')+(grow?' grow':'')+'"><div class="aicj-line-fill"></div></div>';
    }
    return html;
  }).join('')+'</div>';
}
function buildAIContractJourneyBarHTML(stage){return buildAIJourneyBarHTML('contract-creation',stage,'contract');}
function aiCtLoaderTarget(){return document.getElementById('aicj-inner')||document.getElementById('adt-content');}
function parseAIContractPrompt(text){
  const countries=['Netherlands','India','Germany','Spain','United Kingdom','France','Italy'];
  const empTypes=['EOR','PEO','Contractor'];
  let country='',empType='',name=text||'';
  countries.forEach(function(c){if(new RegExp('\\b'+c+'\\b','i').test(name)){country=c;name=name.replace(new RegExp('\\b'+c+'\\b','i'),'');}});
  empTypes.forEach(function(t){if(new RegExp('\\b'+t+'\\b','i').test(name)){empType=t;name=name.replace(new RegExp('\\b'+t+'\\b','i'),'');}});
  name=name.replace(/\b(create|contract|for|an|a|in|the|please|make|start|new|with|of)\b/gi,'').replace(/[,]/g,' ').replace(/\s+/g,' ').trim();
  return {name:name,country:country,empType:empType};
}
function findExistingEmployee(name){
  if(!name)return null;
  const q=name.toLowerCase().trim();if(!q)return null;
  const all=directEmpData.concat(globalEmpData);
  return all.find(function(e){return e.name.toLowerCase()===q;})
    || all.find(function(e){return e.name.toLowerCase().indexOf(q)!==-1||q.indexOf(e.name.toLowerCase())!==-1;})
    || null;
}
function buildAIContractAssistantHTML(){
  return '<div class="ep-page" style="max-width:1040px;margin:0 auto">'
    +'<button class="ep-back" onclick="page=\'contracts\';renderADTPage()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to Contracts</button>'
    +'<div class="ai-ct-assist-split">'
    +'<div class="ai-ct-assist-left">'
    +'<div class="ep-form-card" style="text-align:center;padding:32px 30px">'
    +'<div class="we-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="var(--orange)" stroke="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg></div>'
    +'<div style="font-size:18px;font-weight:700;color:var(--navy);margin-bottom:6px">AI Contract Assistant</div>'
    +'<div style="font-size:12.5px;color:var(--gray);line-height:1.6;margin:0 auto 22px">The Contract Creation journey is automated. Tell me who you\'re creating a contract for &mdash; I\'ll check ADT records and pre-fill the form for you.</div>'
    +'<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:18px">'
    +'<button class="btn btn-secondary" onclick="aiCtSimulateExisting()">Simulate: Existing Employee</button>'
    +'<button class="btn btn-secondary" onclick="aiCtSimulateNew()">Simulate: New Employee</button>'
    +'</div>'
    +'<div class="input-row" style="margin:0 auto 10px">'
    +'<input class="input-field" id="ai-ct-prompt" placeholder="e.g. Create an EOR contract for Anika Shah in Netherlands" oninput="aiCtLiveParse()" onkeydown="if(event.key===\'Enter\')aiCtSubmitPrompt()">'
    +'<button class="icon-btn active" onclick="aiCtSubmitPrompt()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'
    +'</div>'
    +'<button class="add-link" onclick="page=\'contract-type-select\';renderADTPage()">Skip &mdash; create manually</button>'
    +'</div>'
    +'</div>'
    +'<div class="ai-ct-assist-right" id="ai-ct-result">'
    +'<div class="ai-ct-assist-idle"><div class="ai-ct-assist-idle-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div class="ai-ct-assist-idle-title">Employee lookup will appear here</div><div class="ai-ct-assist-idle-text">Run a simulation or enter a prompt on the left &mdash; matching ADT records or a new-hire form will show up in this panel.</div></div>'
    +'</div>'
    +'</div>'
    +'</div>';
}
function aiCtRunSearch(parsed,label){
  aiCtNotFoundOpen=false;
  const res=document.getElementById('ai-ct-result');if(!res)return;
  res.innerHTML='<div class="ep-form-card">'
    +'<div style="font-size:11.5px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.4px;margin-bottom:14px">Searching ADT employee records for &ldquo;'+label+'&rdquo;&hellip;</div>'
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
    +'<div class="skel-avatar"></div>'
    +'<div style="flex:1"><div class="skel-line" style="width:45%;margin-bottom:8px"></div><div class="skel-line" style="width:65%"></div></div>'
    +'</div>'
    +'<div class="review-grid">'
    +'<div class="skel-line" style="width:70%"></div>'
    +'<div class="skel-line" style="width:50%"></div>'
    +'<div class="skel-line" style="width:65%"></div>'
    +'<div class="skel-line" style="width:55%"></div>'
    +'</div>'
    +'</div>';
  setTimeout(function(){aiCtShowResult(parsed);},1000);
}
function aiCtSubmitPrompt(){
  const inp=document.getElementById('ai-ct-prompt');if(!inp)return;
  const raw=inp.value;
  const parsed=parseAIContractPrompt(raw);
  aiCtRunSearch(parsed,parsed.name||raw);
}
function aiCtSimulateExisting(){
  const inp=document.getElementById('ai-ct-prompt');
  if(inp)inp.value='Create an EOR contract for Anika Shah in Mumbai';
  aiCtRunSearch({name:'Anika Shah',country:'',empType:'EOR'},'Anika Shah');
}
function aiCtSimulateNew(){
  const inp=document.getElementById('ai-ct-prompt');
  if(inp)inp.value='Create a contract for Rohan Verma';
  aiCtRunSearch({name:'Rohan Verma',country:'Germany',empType:'EOR',jobTitle:'Operations Analyst'},'Rohan Verma');
}
function aiCtShowResult(parsed){
  const res=document.getElementById('ai-ct-result');if(!res)return;
  window._aiCtLastParsed=parsed;
  const emp=findExistingEmployee(parsed.name);
  if(emp){
    aiCtNotFoundOpen=false;
    res.innerHTML='<div class="ep-form-card" style="display:flex;align-items:center;gap:10px"><div style="width:22px;height:22px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div><span style="font-size:13px;font-weight:700;color:#16a34a">Found the employee</span></div>';
    setTimeout(function(){aiCtRenderMatchCard(emp,parsed);},600);
  }else{
    aiCtNotFoundOpen=true;
    res.innerHTML=aiCtNotFoundPanel(parsed);
  }
}
function aiCtMockSalary(emp){
  let seed=0;
  (emp.empId||emp.name||'x').split('').forEach(function(ch){seed+=ch.charCodeAt(0);});
  return (45000+(seed%40)*1000).toLocaleString('en-IN');
}
function aiCtRenderMatchCard(emp,parsed){
  const res=document.getElementById('ai-ct-result');if(!res)return;
  const initials=emp.name.split(' ').map(function(n){return n[0];}).slice(0,2).join('');
  res.innerHTML='<div class="ep-form-card">'
    +'<div style="font-size:11.5px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.4px;margin-bottom:12px">&#10003; Match found in ADT</div>'
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
    +'<div class="user-avatar-sm" style="width:40px;height:40px;font-size:14px">'+initials+'</div>'
    +'<div><div style="font-size:14px;font-weight:700;color:var(--navy)">'+emp.name+'</div><div style="font-size:12px;color:var(--gray)">'+(emp.jobTitle||'—')+' &middot; '+(emp.dept||'—')+'</div></div>'
    +'</div>'
    +'<div class="review-grid">'
    +'<div class="review-row"><div class="rr-label">Country</div><div class="rr-val">'+(emp.country||parsed.country||'India')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Employee ID</div><div class="rr-val">'+(emp.empId||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Email</div><div class="rr-val">'+(emp.email||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Status</div><div class="rr-val">'+(emp.status||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Monthly Salary</div><div class="rr-val">'+aiCtMockSalary(emp)+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Department</div><div class="rr-val">'+(emp.dept||'—')+'</div></div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;margin-top:18px">'
    +'<button class="btn btn-primary" onclick="aiCtUseEmployee(\''+emp.empId+'\')">Use this employee &amp; continue</button>'
    +'<button class="btn btn-secondary" onclick="document.getElementById(\'ai-ct-result\').innerHTML=\'\'">Not the right person? Search again</button>'
    +'</div></div>';
}
function aiCtNotFoundPanel(parsed){
  const countryOpts=['','Netherlands','India','Germany','Spain','United Kingdom','France','Italy'].map(function(c){return '<option value="'+c+'">'+(c||'Select Country')+'</option>';}).join('');
  const empTypeOpts=['','EOR','PEO','Contractor'].map(function(t){return '<option value="'+t+'">'+(t||'Select Type')+'</option>';}).join('');
  return '<div class="ep-form-card">'
    +'<div style="font-size:11.5px;font-weight:700;color:#b83a3a;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">No existing employee found</div>'
    +'<div style="font-size:12px;color:var(--gray);margin-bottom:14px">I couldn\'t find &ldquo;'+(parsed.name||'this person')+'&rdquo; in ADT. Enter their details below, or let AI fill the form in for you.</div>'
    +'<button type="button" class="btn btn-secondary" id="ai-ct-autofill-btn" style="margin-bottom:16px" onclick="aiCtSimulateFill()">&#10024; Simulate Auto-Fill</button>'
    +'<div class="ep-form-grid" style="margin-bottom:16px">'
    +'<div class="ep-form-group"><label class="ep-form-label">First Name</label><input class="ep-form-input" id="ai-ct-fname"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Last Name</label><input class="ep-form-input" id="ai-ct-lname"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Country</label><select class="ep-form-select" id="ai-ct-country">'+countryOpts+'</select></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Employment Type</label><select class="ep-form-select" id="ai-ct-emptype">'+empTypeOpts+'</select></div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Job Title</label><input class="ep-form-input" id="ai-ct-jobtitle" placeholder="e.g. Software Engineer"></div>'
    +'</div>'
    +'<button class="btn btn-primary" onclick="aiCtUseManualEntry()">Continue to Contract Form</button>'
    +'</div>';
}
function aiCtSimulateFill(){
  const btn=document.getElementById('ai-ct-autofill-btn');
  if(btn){btn.disabled=true;btn.textContent='AI is filling in the details…';}
  const parsed=window._aiCtLastParsed||{};
  const nameParts=(parsed.name||'Rohan Verma').split(' ');
  const fills=[
    {id:'ai-ct-fname',value:nameParts[0]||'Rohan'},
    {id:'ai-ct-lname',value:nameParts.slice(1).join(' ')||'Verma'},
    {id:'ai-ct-country',value:parsed.country||'Germany'},
    {id:'ai-ct-emptype',value:parsed.empType||'EOR'},
    {id:'ai-ct-jobtitle',value:parsed.jobTitle||'Operations Analyst'}
  ];
  let i=0;
  function next(){
    if(i>=fills.length){
      if(btn)btn.textContent='✓ Details Filled';
      setTimeout(function(){aiCtUseManualEntry();},700);
      return;
    }
    const f=fills[i];
    const el=document.getElementById(f.id);
    if(el){
      el.value=f.value;
      el.classList.add('ai-ct-field-fill');
      setTimeout(function(){el.classList.remove('ai-ct-field-fill');},400);
    }
    i++;
    setTimeout(next,500);
  }
  next();
}
function aiCtLiveParse(){
  if(!aiCtNotFoundOpen)return;
  const inp=document.getElementById('ai-ct-prompt');if(!inp)return;
  const parsed=parseAIContractPrompt(inp.value);
  const fn=document.getElementById('ai-ct-fname'),ln=document.getElementById('ai-ct-lname'),co=document.getElementById('ai-ct-country'),et=document.getElementById('ai-ct-emptype');
  if(fn&&parsed.name)fn.value=parsed.name.split(' ')[0];
  if(ln&&parsed.name)ln.value=parsed.name.split(' ').slice(1).join(' ');
  if(co&&parsed.country)co.value=parsed.country;
  if(et&&parsed.empType)et.value=parsed.empType;
}
function aiCtRouteToContractType(empType){
  if(empType==='PEO'||empType==='EOR'){ctFormType=empType;ctFormStep=0;page=ctFormPage(empType);}
  else{page='contract-type-select';}
  renderADTPage();
}
function aiCtUseEmployee(empId){
  const emp=directEmpData.concat(globalEmpData).find(function(e){return String(e.empId)===String(empId);});
  if(!emp)return;
  const parsed=window._aiCtLastParsed||{};
  const parts=emp.name.split(' ');
  aiContractPrefill={fname:parts[0]||'',lname:parts.slice(1).join(' '),email:emp.email||'',country:emp.country||parsed.country||'India',jobTitle:emp.jobTitle||''};
  aiAssistedFlow=true;aiWizardFormData={};aiCreatedContractId=null;
  aiCtJourneyEmployee=emp;aiCtPendingEmpType=parsed.empType||'';
  const promptEl=document.getElementById('ai-ct-prompt');
  aiCtChatMsgs=[
    {role:'user',text:(promptEl&&promptEl.value)||('Create a contract for '+emp.name)},
    {role:'bot',text:'Found <b>'+emp.name+'</b> in ADT &mdash; '+(emp.country||parsed.country||'India')+', '+(emp.jobTitle||'—')+'. I\'ve pre-filled the contract form on the right with their details. Review each step and continue when you\'re ready.'}
  ];
  aiCtRouteToContractType(aiCtPendingEmpType);
}
function aiCtUseManualEntry(){
  const gv=function(id){const el=document.getElementById(id);return el?el.value:'';};
  const fname=gv('ai-ct-fname'),lname=gv('ai-ct-lname'),country=gv('ai-ct-country'),empType=gv('ai-ct-emptype'),jobTitle=gv('ai-ct-jobtitle');
  const fullName=(fname+' '+lname).trim()||'New Employee';
  const isGlobal=!!country;
  const arr=isGlobal?globalEmpData:directEmpData;
  const newId=arr.reduce(function(m,e){return Math.max(m,e.id);},0)+1;
  const empId=(isGlobal?'GEP':'EMP')+String(newId).padStart(3,'0');
  const now=aiFormatNow();
  const rec=Object.assign({id:newId,name:fullName,empId:empId,dept:'—',jobTitle:jobTitle||'—',joinDate:now.date,desc:'Created via AI Contract Assistant',contact:'—',email:'—',status:'Active'},
    isGlobal?{country:country,workerType:empType||'EOR'}:{branch:'—'});
  arr.push(rec);
  aiCtJourneyEmployee=rec;aiCtPendingEmpType=empType||'';
  aiContractPrefill={fname:fname,lname:lname,email:'',country:country,jobTitle:jobTitle};
  aiAssistedFlow=true;aiWizardFormData={};aiCreatedContractId=null;
  const promptEl=document.getElementById('ai-ct-prompt');
  aiCtChatMsgs=[
    {role:'user',text:(promptEl&&promptEl.value)||('Create a contract for '+fullName)},
    {role:'bot',text:'I couldn\'t find <b>'+fullName+'</b> in ADT, so I created a new employee record ('+empId+') and started a new contract using the details you gave me.'}
  ];
  page='ai-employee-created';renderADTPage();
}
function aiCtContinueAfterEmployeeCreated(){
  aiCtRouteToContractType(aiCtPendingEmpType);
}
function buildAIEmployeeCreatedHTML(){
  const rec=aiCtJourneyEmployee||{};
  return '<div class="ep-page" style="max-width:680px;margin:20px auto 0">'
    +'<div class="success-card">'
    +'<div class="success-check" style="width:64px;height:64px;margin-bottom:18px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="26" height="26"><polyline points="20 6 9 17 4 12"/></svg></div>'
    +'<h2 style="font-size:20px;font-weight:700;margin-bottom:6px">Employee Created</h2>'
    +'<p style="font-size:12.5px;color:var(--gray);margin-bottom:20px;max-width:380px;line-height:1.55">AI created a new ADT employee record. You can now continue to build the contract proposal for them.</p>'
    +'<div class="review-section" style="text-align:left;width:100%;max-width:380px;margin-bottom:20px">'
    +'<div class="review-grid">'
    +'<div class="review-row"><div class="rr-label">Name</div><div class="rr-val">'+(rec.name||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Employee ID</div><div class="rr-val">'+(rec.empId||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Country</div><div class="rr-val">'+(rec.country||'India')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Job Title</div><div class="rr-val">'+(rec.jobTitle||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Status</div><div class="rr-val">'+(rec.status||'Active')+'</div></div>'
    +'</div></div>'
    +'<button class="btn btn-success" onclick="aiCtContinueAfterEmployeeCreated()">Continue to Contract Details</button>'
    +'</div></div>';
}
function buildAIAssistedContractSplitHTML(type){
  const formHtml=buildContractFormHTML(type,ctFormStep,true);
  return '<div class="ai-ct-split">'
    +'<div class="ai-ct-split-chat">'
    +'<div class="chat-area" id="ai-ct-chat"></div>'
    +'<div class="input-area"><div class="input-row">'
    +'<input class="input-field" id="ai-ct-chat-input-field" placeholder="Ask AI or add more details..." onkeydown="if(event.key===\'Enter\')aiCtChatSend()">'
    +'<button class="icon-btn active" onclick="aiCtChatSend()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'
    +'</div></div>'
    +'</div>'
    +'<div class="form-col" style="flex:1;background:#f8f9fb">'
    +'<div class="form-panel" style="margin:14px">'+formHtml+'</div>'
    +'</div>'
    +'</div>';
}
function initAICtChatPanel(){renderChat('ai-ct-chat',aiCtChatMsgs);}
function aiCtChatSend(){
  const inp=document.getElementById('ai-ct-chat-input-field');if(!inp)return;
  const text=inp.value.trim();if(!text)return;
  aiCtChatMsgs.push({role:'user',text:text});
  inp.value='';
  renderChat('ai-ct-chat',aiCtChatMsgs);
  setTimeout(function(){
    aiCtChatMsgs.push({role:'bot',text:'Got it &mdash; I\'ve noted that. Keep filling in the form on the right, and I\'ll keep helping as you go.'});
    renderChat('ai-ct-chat',aiCtChatMsgs);
  },500);
}
function aiCtPushStepMessage(step){
  const msgs={1:'Now let\'s confirm the job details &mdash; title, schedule, and pay.',2:'Almost done &mdash; just leave entitlement, probation, and notice period left.'};
  if(msgs[step])aiCtChatMsgs.push({role:'bot',text:msgs[step]});
}
function genProposalId(){return 'PRO-'+Math.floor(1000+Math.random()*9000);}
function aiFormatNow(){
  const d=new Date();const p2=function(n){return String(n).padStart(2,'0');};
  return {date:d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()),time:p2(d.getHours())+':'+p2(d.getMinutes())+':'+p2(d.getSeconds())};
}
function aiGenCommercial(payAmount){
  const p=parseFloat(payAmount)||50000;
  const s=function(mult){return (p*mult/1000000).toFixed(2);};
  return {adtFee:'549',annualGross:s(12),baseGross:s(1),holidayBonus:s(0.08),month13:s(1),monthlyGrossNet:s(0.7),monthlyInvoice:s(1.2),monthlySalary12:s(0.9),monthlySalary1392:s(1),netPay:s(1.3),socialPremAmt:s(0.26),socialPremPct:'26.02',totalMonthlyGross:s(1)};
}
function aiSubmitAssistedContract(type){
  // Capture whatever is on the final step, then merge with everything gathered across earlier steps
  // (the wizard re-renders each step from scratch, so aiWizardFormData is the accumulated source of truth).
  aiCaptureCurrentStep();
  const p=Object.assign({},aiContractPrefill||{},aiWizardFormData||{});
  const fullName=((p.fname||'')+' '+(p.lname||'')).trim()||'New Employee';
  const now=aiFormatNow();
  const newId=contractsData.reduce(function(m,c){return Math.max(m,c.id);},0)+1;
  const contractId=String(90000+Math.floor(Math.random()*9999));
  const from=p.fromDate||now.date;
  const record={
    id:newId,contractId:contractId,empName:fullName,empDesig:p.jobTitle||'—',country:p.country||'—',type:type,date:now.date+' '+now.time,status:'Submitted',
    nationality:p.country||'India',countryOfOp:p.country||'—',workPermit:p.workPermit===true,gender:(p.gender||'').toUpperCase()||'—',
    email:p.email||'—',contact:p.mobile||'—',dob:p.dob||'—',jobTitle:p.jobTitle||'—',skill:p.skill||'—',
    empDuration:from+(p.toDate?' – '+p.toDate:''),empType:type,workSchedule:p.hours||'—',payAmount:p.pay||'—',currency:'INR',
    jobDesc:p.jobDesc||'—',payFrequency:'Monthly',
    commercial:aiGenCommercial(p.pay),
    complianceItems:[{item:type+' '+(p.country||'')+' Proposal',note:'Optional',status:'Pending',doc:null}]
  };
  contractsData.unshift(record);
  ctLogsData[newId]=[{date:now.date,time:now.time,user:'AI Contract Assistant',status:'Submitted',action:'Contract created via AI Contract Assistant for '+fullName+'.'}];
  ctWorkflowData[newId]=[{title:'Contract Created by AI',user:'AI Contract Assistant',date:now.date,time:now.time,description:'AI compiled the proposal and contract data from the conversation for '+fullName+'.'}];
  aiCreatedContractId=newId;
  aiProposalDraft={
    proposalId:genProposalId(),
    name:fullName,
    country:p.country||'—',
    jobTitle:p.jobTitle||'—',
    type:type,
    contractRecordId:newId
  };
  const col=aiCtLoaderTarget();
  if(col)col.innerHTML='<div class="contract-loader"><div class="cl-spinner"></div><div class="cl-title">Creating Proposal&hellip;</div><div class="cl-sub">Compiling contract data into a proposal for '+aiProposalDraft.name+'</div></div>';
  setTimeout(function(){page='ai-proposal-created';renderADTPage();},1400);
}
let _aiAutoAdvanceTimer=null;
function aiScheduleAutoAdvance(expectedPage,fn,delay){
  if(_aiAutoAdvanceTimer)clearTimeout(_aiAutoAdvanceTimer);
  _aiAutoAdvanceTimer=setTimeout(function(){_aiAutoAdvanceTimer=null;if(page===expectedPage)fn();},delay||1300);
}
function showAiToast(title,sub){
  const stack=document.getElementById('ai-toast-stack');if(!stack)return;
  const el=document.createElement('div');
  el.className='ai-toast';
  el.innerHTML='<div class="ai-toast-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>'
    +'<div><div class="ai-toast-title">'+title+'</div>'+(sub?'<div class="ai-toast-sub">'+sub+'</div>':'')+'</div>';
  stack.appendChild(el);
  setTimeout(function(){
    el.classList.add('ai-toast-out');
    setTimeout(function(){el.remove();},250);
  },3200);
}
function buildAIProposalCreatedHTML(){
  const d=aiProposalDraft||{};
  return '<div class="ep-page" style="max-width:680px;margin:40px auto">'
    +'<div class="success-card">'
    +'<div class="success-check" style="width:64px;height:64px;margin-bottom:18px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="26" height="26"><polyline points="20 6 9 17 4 12"/></svg></div>'
    +'<h2 style="font-size:20px;font-weight:700;margin-bottom:6px">Proposal Created</h2>'
    +'<p style="font-size:12.5px;color:var(--gray);margin-bottom:12px;max-width:380px;line-height:1.55">AI compiled the contract details you entered into a proposal, ready to send to the deal manager for approval.</p>'
    +'<div style="margin-bottom:20px">'+aiCtCurrentAgentBadge()+'</div>'
    +'<div class="review-section" style="text-align:left;width:100%;max-width:420px;margin-bottom:20px">'
    +'<div class="review-grid">'
    +'<div class="review-row"><div class="rr-label">Proposal ID</div><div class="rr-val">'+d.proposalId+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Employee</div><div class="rr-val">'+d.name+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Country</div><div class="rr-val">'+d.country+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Contract Type</div><div class="rr-val">'+d.type+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Job Title</div><div class="rr-val">'+d.jobTitle+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Status</div><div class="rr-val">Draft</div></div>'
    +'</div></div>'
    +'<div style="font-size:11.5px;color:var(--gray)">Automatically sending to the Deal Manager for approval<span class="ai-ellipsis"><span>.</span><span>.</span><span>.</span></span></div>'
    +'</div></div>';
}
function aiSendProposalForApproval(){
  const col=aiCtLoaderTarget();
  if(col)col.innerHTML='<div class="contract-loader"><div class="cl-spinner"></div><div class="cl-title">Notifying '+aiDealManager.name+'&hellip;</div><div class="cl-sub">Sending proposal '+((aiProposalDraft&&aiProposalDraft.proposalId)||'')+' for approval</div></div>';
  notifData.unshift({name:'Proposal sent for approval — '+((aiProposalDraft&&aiProposalDraft.name)||''),cid:(aiProposalDraft&&aiProposalDraft.proposalId)||'',time:'Just now',pending:true});
  showAiToast('Proposal sent to '+aiDealManager.name,((aiProposalDraft&&aiProposalDraft.name)||'')+' — '+((aiProposalDraft&&aiProposalDraft.proposalId)||''));
  if(aiCreatedContractId){
    const rec=contractsData.find(function(c){return c.id===aiCreatedContractId;});
    if(rec){
      rec.status='Proposal Sent';
      const now=aiFormatNow();
      (ctLogsData[aiCreatedContractId]=ctLogsData[aiCreatedContractId]||[]).unshift({date:now.date,time:now.time,user:'Pallavi Parate',status:'Proposal Sent',action:'Proposal sent to '+aiDealManager.name+' ('+aiDealManager.role+') for approval.'});
    }
  }
  setTimeout(function(){page='ai-proposal-waiting-approval';renderADTPage();},1400);
}
function buildAIWaitingApprovalHTML(opts){
  const backLabel=opts.backLabel||'Back to Contracts';
  const backAction=opts.backAction||"page='contracts';renderADTPage()";
  return '<div class="ep-page" style="max-width:680px;margin:20px auto 0;text-align:center">'
    +'<div class="ep-form-card" style="padding:40px 32px">'
    +'<div style="width:64px;height:64px;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;margin:0 auto 18px">'
    +'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
    +'</div>'
    +'<div class="success-meta" style="background:#fef3c7;color:#b45309;margin:0 auto 14px">&#9203; Pending Approval</div>'
    +'<h2 style="font-size:19px;font-weight:700;margin-bottom:8px">Waiting for Approval</h2>'
    +'<p style="font-size:12.5px;color:var(--gray);line-height:1.6;margin-bottom:20px">'+opts.description+'</p>'
    +'<div class="ai-timeline" style="text-align:left;max-width:360px;margin:0 auto 24px">'
    +opts.timelineItems.map(function(it,i){
      const chips=it.chips.map(function(c){return '<span class="ai-chip '+c.cls+'">'+c.label+'</span>';}).join('');
      return '<div class="ai-timeline-item"><div class="ai-timeline-dot '+it.dotClass+'">'+(i+1)+'</div><div class="ai-timeline-card" style="cursor:default'+(it.pending?';opacity:.55':'')+'"><div class="ai-timeline-card-title">'+it.label+'</div><div class="ai-timeline-chips">'+chips+'</div></div></div>';
    }).join('')
    +'</div>'
    +'<div style="display:flex;gap:10px;justify-content:center">'
    +'<button class="btn btn-secondary" onclick="'+backAction+'">'+backLabel+'</button>'
    +'<button class="btn btn-success" onclick="'+opts.onApprove+'">'+opts.approveLabel+'</button>'
    +'</div>'
    +'</div></div>';
}
function buildAIProposalWaitingApprovalHTML(){
  const d=aiProposalDraft||{};
  return buildAIWaitingApprovalHTML({
    description:'We\'ve notified <strong style="color:var(--navy)">'+aiDealManager.name+'</strong> (Deal Manager) to review proposal <strong>'+d.proposalId+'</strong> for <strong>'+d.name+'</strong>. Once approved, this journey will automatically continue to contract generation.',
    timelineItems:[
      {label:'Proposal Created',dotClass:'ai',chips:[{cls:'ai-chip-ai',label:'AI Automated'}]},
      {label:'Waiting for '+aiDealManager.name+'\'s Approval',dotClass:'human',chips:[{cls:'ai-chip-human',label:'Human Required'},{cls:'ai-chip-approval',label:'Approval Required'}]},
      {label:'Contract Generation (pending)',dotClass:'system',chips:[{cls:'ai-chip-system',label:'System Action'}],pending:true}
    ],
    onApprove:'aiSimulateApproval()',
    approveLabel:'Simulate: '+aiDealManager.name+' Approves'
  });
}
function buildAIContractWaitingApprovalHTML(){
  const rec=contractsData.find(function(c){return c.id===aiCreatedContractId;})||{};
  return buildAIWaitingApprovalHTML({
    description:'We\'ve notified <strong style="color:var(--navy)">'+aiOpsManager.name+'</strong> (Ops Manager) to review contract <strong>'+(rec.contractId||'')+'</strong> for <strong>'+(rec.empName||'')+'</strong>. Once approved, this journey will automatically continue to onboarding.',
    timelineItems:[
      {label:'Contract Generated',dotClass:'ai',chips:[{cls:'ai-chip-ai',label:'AI Automated'}]},
      {label:'Waiting for '+aiOpsManager.name+'\'s Approval',dotClass:'human',chips:[{cls:'ai-chip-human',label:'Human Required'},{cls:'ai-chip-approval',label:'Approval Required'}]},
      {label:'Onboarding (pending)',dotClass:'system',chips:[{cls:'ai-chip-system',label:'System Action'}],pending:true}
    ],
    onApprove:'aiSimulateContractApproval()',
    approveLabel:'Simulate: '+aiOpsManager.name+' Approves'
  });
}
function aiSimulateContractApproval(){
  const col=aiCtLoaderTarget();
  if(col)col.innerHTML='<div class="contract-loader"><div class="cl-spinner"></div><div class="cl-title">Approving Contract&hellip;</div><div class="cl-sub">'+aiOpsManager.name+' is reviewing the signed contract</div></div>';
  setTimeout(function(){
    if(notifData[0]&&notifData[0].pending)notifData[0].pending=false;
    if(aiCreatedContractId){
      const rec=contractsData.find(function(c){return c.id===aiCreatedContractId;});
      if(rec){
        rec.status='Contract Approved';
        const now=aiFormatNow();
        (ctLogsData[aiCreatedContractId]=ctLogsData[aiCreatedContractId]||[]).unshift({date:now.date,time:now.time,user:aiOpsManager.name,status:'Contract Approved',action:aiOpsManager.name+' approved the signed contract.'});
        (ctWorkflowData[aiCreatedContractId]=ctWorkflowData[aiCreatedContractId]||[]).unshift({title:'Contract Approved',user:aiOpsManager.name,date:now.date,time:now.time,description:'Ops Manager approved the contract for '+rec.empName+'.'});
        showAiToast(aiOpsManager.name+' approved the contract',rec.empName?'Onboarding for '+rec.empName+' is starting':'Onboarding is starting');
      }
    }
    page='ai-onboarding-run';renderADTPage();aiCtStartOnboarding();
  },1500);
}
function buildAIContractDocumentHTML(){
  const rec=contractsData.find(function(c){return c.id===aiCreatedContractId;})||{};
  const d=aiProposalDraft||{};
  const now=aiFormatNow();
  const entity='ADT '+(rec.country||d.country||'Netherlands')+(rec.type==='PEO'?' PEO Services B.V.':' EOR Services B.V.');
  return '<div style="padding:8px 0 24px">'
    +'<div class="adt-doc-page">'
    +'<div class="adt-doc-header">'
    +'<div><div class="adt-doc-brand">ADT</div><div class="adt-doc-brand-sub">Global Employment Platform</div></div>'
    +'<div><div class="adt-doc-title">EMPLOYMENT AGREEMENT</div><div class="adt-doc-meta">Contract No. '+(rec.contractId||'—')+'<br>Issued '+now.date+'</div></div>'
    +'</div>'
    +'<div style="margin-bottom:18px">'+aiCtCurrentAgentBadge()+'</div>'
    +'<div class="adt-doc-section">'
    +'<div class="adt-doc-section-title">Parties</div>'
    +'<div class="review-grid">'
    +'<div class="review-row"><div class="rr-label">Employer</div><div class="rr-val">'+entity+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Employee</div><div class="rr-val">'+(rec.empName||d.name||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Country of Employment</div><div class="rr-val">'+(rec.country||d.country||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Contract Type</div><div class="rr-val">'+(rec.type||d.type||'—')+'</div></div>'
    +'</div></div>'
    +'<div class="adt-doc-section">'
    +'<div class="adt-doc-section-title">Position &amp; Compensation</div>'
    +'<div class="review-grid">'
    +'<div class="review-row"><div class="rr-label">Job Title</div><div class="rr-val">'+(rec.jobTitle||d.jobTitle||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Employment Term</div><div class="rr-val">'+(rec.empDuration||'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Monthly Gross Pay</div><div class="rr-val">'+(rec.payAmount?rec.payAmount+' '+(rec.currency||''):'—')+'</div></div>'
    +'<div class="review-row"><div class="rr-label">Pay Frequency</div><div class="rr-val">'+(rec.payFrequency||'Monthly')+'</div></div>'
    +'</div></div>'
    +'<div class="adt-doc-section">'
    +'<div class="adt-doc-section-title">Terms</div>'
    +'<p class="adt-doc-clause">This Employment Agreement ("Agreement") is entered into between '+entity+' ("Employer") and '+(rec.empName||d.name||'the Employee')+' ("Employee"), effective as of the date of countersignature below.</p>'
    +'<p class="adt-doc-clause">The Employee shall perform the duties of '+(rec.jobTitle||d.jobTitle||'the assigned role')+' in accordance with local labor law and the Employer\'s policies, and shall be compensated as set out above, payable in arrears on a '+(rec.payFrequency||'Monthly').toLowerCase()+' basis.</p>'
    +'<p class="adt-doc-clause">This Agreement is governed by the employment laws of '+(rec.country||d.country||'the country of employment')+'. Either party may terminate this Agreement in accordance with the statutory notice period applicable in that jurisdiction.</p>'
    +'</div>'
    +'<div class="adt-doc-sig-row">'
    +'<div class="adt-doc-sig-block">For and on behalf of '+entity+'<div class="adt-doc-sig-label">Authorized Signatory &middot; '+now.date+'</div></div>'
    +'<div class="adt-doc-sig-block">'+(rec.empName||d.name||'Employee')+'<div class="adt-doc-sig-label">Employee Signature &middot; Pending</div></div>'
    +'</div>'
    +'</div>'
    +'<div style="text-align:center;margin-top:22px;font-size:11.5px;color:var(--gray)">Automatically sending for signature via Docuseal<span class="ai-ellipsis"><span>.</span><span>.</span><span>.</span></span></div>'
    +'</div>';
}
function aiSendContractForApproval(){
  const col=aiCtLoaderTarget();
  if(col)col.innerHTML='<div class="contract-loader"><div class="cl-spinner"></div><div class="cl-title">Sending for Signature&hellip;</div><div class="cl-sub">Routing the contract to '+aiOpsManager.name+' for approval</div></div>';
  if(aiCreatedContractId){
    const rec=contractsData.find(function(c){return c.id===aiCreatedContractId;});
    if(rec){
      rec.status='Contract Sent';
      const now=aiFormatNow();
      (ctLogsData[aiCreatedContractId]=ctLogsData[aiCreatedContractId]||[]).unshift({date:now.date,time:now.time,user:'AI Contract Assistant',status:'Contract Sent',action:'Contract generated and sent to '+aiOpsManager.name+' ('+aiOpsManager.role+') for approval.'});
    }
  }
  notifData.unshift({name:'Contract sent for approval — '+((aiProposalDraft&&aiProposalDraft.name)||''),cid:aiCreatedContractId||'',time:'Just now',pending:true});
  showAiToast('Contract sent for signature',aiOpsManager.name+' has been notified for approval');
  setTimeout(function(){page='ai-contract-waiting-approval';renderADTPage();},1400);
}
let aiCtOnboardingStep=-1;
const aiCtOnboardingSteps=[
  {label:'Documents',running:'Collecting onboarding documents…',type:'ai'},
  {label:'Compliance Checks',running:'Running compliance checks…',type:'ai'},
  {label:'System Access Provisioning',running:'Provisioning system access…',type:'ai'}
];
function aiCtStartOnboarding(){
  aiCtOnboardingStep=0;
  if(aiCreatedContractId){
    const rec=contractsData.find(function(c){return c.id===aiCreatedContractId;});
    if(rec)rec.status='Onboarding';
  }
  aiCtRunOnboardingStep();
}
function aiCtRunOnboardingStep(){
  const step=aiCtOnboardingSteps[aiCtOnboardingStep];
  if(!step){
    if(aiCreatedContractId){
      const rec=contractsData.find(function(c){return c.id===aiCreatedContractId;});
      if(rec)rec.status='Ready for Payroll';
    }
    page='ai-journey-complete';renderADTPage();
    return;
  }
  setTimeout(function(){
    aiCtOnboardingStep++;
    navigatePage('ai-onboarding-run');
    aiCtRunOnboardingStep();
  },900);
}
function buildAIOnboardingRunHTML(){
  return '<div class="ep-page" style="max-width:680px;margin:0 auto">'
    +'<div class="ai-timeline">'+buildAIRunTimelineHTML({steps:aiCtOnboardingSteps},aiCtOnboardingStep)+'</div>'
    +'</div>';
}
function buildAIJourneyCompleteHTML(){
  const rec=contractsData.find(function(c){return c.id===aiCreatedContractId;})||{};
  const emp=aiCtJourneyEmployee||{};
  const empRows=aiDrawerRow('Name',emp.name||rec.empName||'—')
    +aiDrawerRow('Employee ID',emp.empId||'—')
    +aiDrawerRow('Country',emp.country||rec.country||'—')
    +aiDrawerRow('Job Title',emp.jobTitle||rec.jobTitle||'—')
    +aiDrawerRow('Status',emp.status||'Active');
  const contractRows=aiDrawerRow('Contract No.',rec.contractId||'—')
    +aiDrawerRow('Contract Type',rec.type||'—')
    +aiDrawerRow('Proposal ID',(aiProposalDraft&&aiProposalDraft.proposalId)||'—')
    +aiDrawerRow('Monthly Pay',rec.payAmount?rec.payAmount+' '+(rec.currency||''):'—')
    +aiDrawerRow('Status',rec.status||'Ready for Payroll');
  return '<div class="ep-page" style="max-width:680px;margin:20px auto 0">'
    +'<div class="success-card">'
    +'<div class="success-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>'
    +'<h2 style="font-size:20px;font-weight:700;margin-bottom:6px">Contract Creation Journey Complete</h2>'
    +'<p style="font-size:12.5px;color:var(--gray);margin-bottom:22px;max-width:420px;line-height:1.55">'+(emp.name||rec.empName||'The employee')+' has been onboarded and is ready for payroll. Here\'s a summary of everything AI put together.</p>'
    +'<div style="text-align:left;width:100%;max-width:460px">'
    +'<div class="review-section"><div class="review-title">Employee Details</div><div class="review-grid" style="grid-template-columns:1fr">'+empRows+'</div></div>'
    +'<div class="review-section"><div class="review-title">Contract Details</div><div class="review-grid" style="grid-template-columns:1fr">'+contractRows+'</div></div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;margin-top:6px">'
    +'<button class="btn btn-secondary" onclick="navigatePage(\'contracts\')">View in Contracts</button>'
    +'<button class="btn btn-primary" onclick="addListingItem(\'contracts\')">Start Another</button>'
    +'</div>'
    +'</div></div>';
}
// -- ACTIVE AUTOMATION / RUN DETAIL --
function aiRunStepStatus(run,idx){
  if(run.status==='Completed')return 'done';
  if(idx<run.currentStepIdx)return 'done';
  if(idx===run.currentStepIdx)return run.status==='Exception'?'exception':'current';
  return 'pending';
}
function aiRunCounts(run,journeyId){
  const events=aiJourneyEvents[journeyId||selectedAIJourneyId]||[];
  let aiCompleted=0,humanPending=0;
  events.forEach(function(e,i){
    const st=aiRunStepStatus(run,i);
    if(st==='done'&&e.chips.includes('AI Automated'))aiCompleted++;
    if(st==='current'||st==='exception')humanPending++;
  });
  return {aiCompleted:aiCompleted,humanPending:humanPending};
}
function aiRunStatusPillClass(status){return status==='Active'?'active':status==='Waiting for Approval'?'pending':status==='Exception'?'inactive':status==='Completed'?'approved':'draft';}
function viewAIActiveAutomation(journeyId){selectedAIJourneyId=journeyId;navigatePage('ai-active-automation');}
function viewAIRun(runId){selectedAIRunId=runId;navigatePage('ai-run-detail');}

function buildAIActiveAutomationHTML(){
  const j=aiJourneys.find(x=>x.id===selectedAIJourneyId)||aiJourneys[0];
  const runs=aiAutomationRuns[j.id]||[];
  const cfg=aiAutomationConfigs[j.id];
  const totalRuns=runs.length;
  const exceptions=runs.filter(function(r){return r.status==='Exception';}).length;
  const successRate=totalRuns?Math.round((runs.filter(function(r){return r.status!=='Exception';}).length/totalRuns)*100):100;
  const rows=runs.map(function(r){
    const events=aiJourneyEvents[j.id]||[];
    const step=events[Math.min(r.currentStepIdx,events.length-1)];
    const counts=aiRunCounts(r,j.id);
    const lastStepName=events.length?events[events.length-1].name:'Completed';
    return '<tr style="cursor:pointer" onclick="viewAIRun(\''+r.runId+'\')">'
      +'<td><div class="cell-primary">'+r.client+'</div><div class="cell-sub">'+r.runId+'</div></td>'
      +'<td><div class="cell-primary">'+r.country+'</div><div class="cell-sub">'+r.contractType+'</div></td>'
      +'<td>'+(r.status==='Completed'?'Ready for Payroll':(step?step.name:'—'))+'</td>'
      +'<td><div class="ai-run-progress"><span class="ai-run-progress-ai">'+counts.aiCompleted+' AI</span><span class="ai-run-progress-human">'+counts.humanPending+' pending</span></div></td>'
      +'<td><span class="status-pill '+aiRunStatusPillClass(r.status)+'">'+r.status+'</span></td>'
      +'<td class="cell-sub">'+r.lastActivity+'</td>'
      +'<td onclick="event.stopPropagation()"><button class="btn btn-secondary btn-sm" onclick="viewAIRun(\''+r.runId+'\')">View Run</button></td>'
      +'</tr>';
  }).join('');
  return '<div class="ai-exec-page">'
    +'<button class="ep-cancel-btn" style="margin-bottom:14px" onclick="navigatePage(\'ai-journey-detail\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg> Back to '+j.name+'</button>'
    +'<p style="font-size:16px;font-weight:700;margin-bottom:4px">'+j.name+' Automation</p>'
    +'<p style="font-size:12px;color:var(--gray);margin-bottom:14px">Live view of every run this automation has triggered, and where each one currently stands.</p>'
    +'<div class="ai-run-meta">'
    +'<div class="ai-run-meta-item"><span class="ai-run-meta-label">Trigger</span><span class="ai-run-meta-val">'+(cfg&&cfg.trigger?cfg.trigger:'Trigger when proposal is approved')+'</span></div>'
    +'<div class="ai-run-meta-item"><span class="ai-run-meta-label">Entity</span><span class="ai-run-meta-val">'+(cfg&&cfg.entity?cfg.entity:'All ADT Entities')+'</span></div>'
    +'<div class="ai-run-meta-item"><span class="ai-run-meta-label">Country</span><span class="ai-run-meta-val">'+(cfg&&cfg.country?cfg.country:'Multiple Countries')+'</span></div>'
    +'<div class="ai-run-meta-item"><span class="ai-run-meta-label">Created by</span><span class="ai-run-meta-val">Pallavi Parate</span></div>'
    +'</div>'
    +'<div class="stat-grid" style="margin-bottom:20px">'
    +'<div class="stat-card"><div class="stat-label"><span>Automation Status</span></div><div class="stat-val" style="font-size:16px;color:#16a34a">Active</div></div>'
    +'<div class="stat-card"><div class="stat-label"><span>Total Runs</span></div><div class="stat-val">'+totalRuns+'</div></div>'
    +'<div class="stat-card"><div class="stat-label"><span>Success Rate</span></div><div class="stat-val" style="color:#16a34a">'+successRate+'%</div></div>'
    +'<div class="stat-card"><div class="stat-label"><span>Exceptions Pending</span></div><div class="stat-val" style="color:'+(exceptions?'#b83a3a':'var(--navy)')+'">'+exceptions+'</div></div>'
    +'</div>'
    +'<div class="listing-card">'
    +'<table class="listing-table ai-run-table"><thead><tr>'
    +'<th>Client</th><th>Country &amp; Type</th><th>Current Step</th><th>Progress</th><th>Status</th><th>Last Activity</th><th>Action</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table>'
    +'</div></div>';
}

function aiBackendChipClass(status){
  const map={Fetching:'ai-chip-ai',Validating:'ai-chip-validation','Waiting for Human Approval':'ai-chip-human',Completed:'ai-chip-completed',Failed:'ai-chip-approval',Queued:'ai-chip-queued'};
  return map[status]||'ai-chip-queued';
}
function aiBackendStatusFor(event,isCurrent,runStatus){
  if(!isCurrent)return 'Queued';
  if(runStatus==='Exception')return 'Failed';
  if(event.chips.includes('Human Required')||event.chips.includes('Approval Required'))return 'Waiting for Human Approval';
  if(/valida/i.test(event.name))return 'Validating';
  return 'Fetching';
}
function buildAIRunDetailHTML(){
  const j=aiJourneys.find(x=>x.id===selectedAIJourneyId)||aiJourneys[0];
  const runs=aiAutomationRuns[j.id]||[];
  const run=runs.find(function(r){return r.runId===selectedAIRunId;})||runs[0];
  const events=aiJourneyEvents[j.id]||[];
  const timeline=events.map(function(e,i){
    const st=aiRunStepStatus(run,i);
    const icon=st==='done'?'&#10003;':st==='current'?'&#8987;':st==='exception'?'&#9888;':'&#9675;';
    return '<div class="ai-timeline-item">'
      +'<div class="ai-timeline-dot run-'+st+'">'+icon+'</div>'
      +'<div class="ai-timeline-card" style="cursor:pointer" onclick="openAIEventDrawer(\''+j.id+'\','+i+')">'
      +'<div class="ai-timeline-card-head"><span class="ai-timeline-card-title">'+e.name+'</span></div>'
      +(st==='exception'?'<div class="ai-timeline-card-desc" style="color:#b83a3a">'+(run.exceptionNote||'This step needs attention.')+'</div>':'<div class="ai-timeline-card-desc">'+e.desc+'</div>')
      +'<div class="ai-timeline-chips">'+aiChipsCompact(e.chips)+'</div>'
      +'</div></div>';
  }).join('');

  const currentEvent=events[Math.min(run.currentStepIdx,events.length-1)];
  const nextEvent=events[run.currentStepIdx+1];
  const laterEvent=events[run.currentStepIdx+2];
  const backendRow=function(label,ev,isCurrent){
    if(!ev)return '';
    const st=aiBackendStatusFor(ev,isCurrent,run.status);
    return '<div class="review-row"><div class="rr-label">'+label+'</div><div class="rr-val" style="display:flex;align-items:center;gap:8px;white-space:normal"><span>'+ev.source+'</span><span class="ai-chip '+aiBackendChipClass(st)+'">'+st+'</span></div></div>';
  };
  const backendPanel='<div class="ep-form-card">'
    +'<div class="ep-form-title">Backend Activity</div>'
    +'<div class="review-grid" style="grid-template-columns:1fr">'
    +backendRow('Current',currentEvent,true)
    +backendRow('Next',nextEvent,false)
    +backendRow('Later',laterEvent,false)
    +'</div></div>';

  let actionPanel;
  if(run.status==='Completed'){
    const lastStepName=events.length?events[events.length-1].name:'Completed';
    actionPanel='<div class="ep-form-card" style="text-align:center;padding:32px 24px">'
      +'<div class="success-check" style="width:52px;height:52px;margin:0 auto 14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="22" height="22"><polyline points="20 6 9 17 4 12"/></svg></div>'
      +'<div style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:6px">'+lastStepName+'</div>'
      +'<div style="font-size:12px;color:var(--gray);line-height:1.5">All '+events.length+' events completed. '+run.client+' &mdash; '+j.name+' finished successfully.</div>'
      +'</div>';
  }else if(run.status==='Exception'){
    actionPanel='<div class="ep-form-card">'
      +'<div style="font-size:11.5px;font-weight:700;color:#b83a3a;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Exception &mdash; Action Required</div>'
      +'<div style="font-size:12.5px;color:var(--navy);line-height:1.6;margin-bottom:18px">'+(run.exceptionNote||'This run is blocked and needs review.')+'</div>'
      +'<button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:8px" onclick="aiResolveException(\''+run.runId+'\',\''+j.id+'\')">Resolve Exception &amp; Continue</button>'
      +'<button class="btn btn-secondary" style="width:100%;justify-content:center" onclick="openAIEventDrawer(\''+j.id+'\','+run.currentStepIdx+')">View Event Details</button>'
      +'</div>';
  }else if(run.status==='Waiting for Approval'){
    const aiSummary='AI has completed '+aiRunCounts(run,j.id).aiCompleted+' events for '+run.client+' as part of the '+j.name+'. '+(currentEvent?currentEvent.name+' is required before the journey can continue.':'Review is required before the journey can continue.');
    actionPanel='<div class="ep-form-card">'
      +'<div style="font-size:11.5px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Current Action Required</div>'
      +'<div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:10px">'+(currentEvent?currentEvent.name:'Review pre-filled data')+'</div>'
      +'<div style="font-size:12px;color:var(--gray);line-height:1.6;margin-bottom:18px">'+aiSummary+'</div>'
      +'<button class="btn btn-secondary" style="width:100%;justify-content:center;margin-bottom:8px" onclick="openAIEventDrawer(\''+j.id+'\','+run.currentStepIdx+')">Review Data</button>'
      +'<button class="btn btn-success" style="width:100%;justify-content:center;margin-bottom:8px" onclick="aiApproveRunStep(\''+run.runId+'\',\''+j.id+'\')">Approve and Continue</button>'
      +'<button class="btn btn-secondary" style="width:100%;justify-content:center" onclick="aiRejectRunStep(\''+run.runId+'\',\''+j.id+'\')">Reject / Send for Correction</button>'
      +'</div>';
  }else{
    actionPanel='<div class="ep-form-card">'
      +'<div style="font-size:11.5px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">In Progress</div>'
      +'<div style="font-size:12.5px;color:var(--gray);line-height:1.6">AI or the client is currently working on <strong style="color:var(--navy)">'+(currentEvent?currentEvent.name:'this step')+'</strong>. No admin action is needed right now &mdash; check back shortly.</div>'
      +'</div>';
  }

  const mainContent='<button class="ep-cancel-btn" style="margin-bottom:14px" onclick="navigatePage(\'ai-active-automation\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg> Back to Active Automation</button>'
    +'<p style="font-size:16px;font-weight:700;margin-bottom:4px">'+j.name+' &mdash; '+run.client+'</p>'
    +'<p style="font-size:12px;color:var(--gray);margin-bottom:20px">'+run.country+' &middot; '+run.contractType+' &middot; Run ID '+run.runId+' &middot; <span class="status-pill '+aiRunStatusPillClass(run.status)+'">'+run.status+'</span></p>'
    +'<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px;align-items:start">'
    +'<div><div class="ai-timeline" style="margin-bottom:20px">'+timeline+'</div>'+backendPanel+'</div>'
    +'<div>'+actionPanel+'</div>'
    +'</div>';
  return '<div class="ai-exec-page" style="max-width:1180px">'+mainContent+'</div>';
}

function aiAdvanceRunPastAutoSteps(run,journeyId){
  const events=aiJourneyEvents[journeyId||selectedAIJourneyId]||[];
  run.currentStepIdx++;
  while(run.currentStepIdx<events.length){
    const ev=events[run.currentStepIdx];
    const humanGate=ev.chips.includes('Human Required')||ev.chips.includes('Approval Required');
    if(humanGate)break;
    run.currentStepIdx++;
  }
  if(run.currentStepIdx>=events.length){run.status='Completed';run.currentStepIdx=events.length-1;}
  else{run.status='Waiting for Approval';}
}
function aiApproveRunStep(runId,journeyId){
  const runs=aiAutomationRuns[journeyId||selectedAIJourneyId]||[];
  const run=runs.find(function(r){return r.runId===runId;});if(!run)return;
  const col=document.getElementById('adt-content');
  if(col)col.innerHTML='<div class="contract-loader"><div class="cl-spinner"></div><div class="cl-title">Continuing Journey&hellip;</div><div class="cl-sub">Applying approval and running the next automated events for '+run.client+'</div></div>';
  setTimeout(function(){aiAdvanceRunPastAutoSteps(run,journeyId);run.lastActivity='Just now';navigatePage('ai-run-detail');},1600);
}
function aiRejectRunStep(runId,journeyId){
  const runs=aiAutomationRuns[journeyId||selectedAIJourneyId]||[];
  const run=runs.find(function(r){return r.runId===runId;});if(!run)return;
  const col=document.getElementById('adt-content');
  if(col)col.innerHTML='<div class="contract-loader"><div class="cl-spinner"></div><div class="cl-title">Sending Back for Correction&hellip;</div><div class="cl-sub">'+run.client+'</div></div>';
  setTimeout(function(){run.lastActivity='Just now';navigatePage('ai-run-detail');},1200);
}
function aiResolveException(runId,journeyId){
  const runs=aiAutomationRuns[journeyId||selectedAIJourneyId]||[];
  const run=runs.find(function(r){return r.runId===runId;});if(!run)return;
  const col=document.getElementById('adt-content');
  if(col)col.innerHTML='<div class="contract-loader"><div class="cl-spinner"></div><div class="cl-title">Re-validating&hellip;</div><div class="cl-sub">Re-checking data for '+run.client+' after correction</div></div>';
  setTimeout(function(){aiAdvanceRunPastAutoSteps(run,journeyId);run.lastActivity='Just now';navigatePage('ai-run-detail');},1600);
}

function aiSimulateApproval(){
  const col=aiCtLoaderTarget();
  if(col)col.innerHTML='<div class="contract-loader"><div class="cl-spinner"></div><div class="cl-title">Approving Proposal&hellip;</div><div class="cl-sub">'+aiDealManager.name+' is reviewing '+((aiProposalDraft&&aiProposalDraft.proposalId)||'')+'</div></div>';
  setTimeout(function(){
    if(notifData[0]&&notifData[0].pending)notifData[0].pending=false;
    if(aiCreatedContractId){
      const rec=contractsData.find(function(c){return c.id===aiCreatedContractId;});
      if(rec){
        rec.status='Proposal Approved';
        const now=aiFormatNow();
        (ctLogsData[aiCreatedContractId]=ctLogsData[aiCreatedContractId]||[]).unshift({date:now.date,time:now.time,user:aiDealManager.name,status:'Proposal Approved',action:aiDealManager.name+' approved the proposal. Contract generation will continue automatically.'});
        (ctWorkflowData[aiCreatedContractId]=ctWorkflowData[aiCreatedContractId]||[]).unshift({title:'Proposal Approved',user:aiDealManager.name,date:now.date,time:now.time,description:'Deal Manager approved the AI-generated proposal for '+rec.empName+'.'});
        showAiToast(aiDealManager.name+' approved the proposal','Generating the contract now');
      }
    }
    page='ai-contract-document';renderADTPage();
  },1500);
}

/* ── EDIT FORMS FOR THE DETAIL PANELS ──
   Each panel's Edit opens these fields in place (sbEditReg, core.js). The
   choices offered are the ones already in use across that listing, plus the
   record's own value, so nothing can be picked that the filters do not know. */
function sbUniq(list,key,extra){
  const out=[];
  (extra||[]).concat(list.map(function(x){return x[key];})).forEach(function(v){if(v&&v!=='--'&&out.indexOf(v)<0)out.push(v);});
  return out;
}
const SB_ACTIVE=['Active','Inactive'];
sbEditReg('tm',{prefix:'tm',render:renderTmSidebar,noun:'Team',
  get:function(id){return teamsData.find(function(t){return t.id===id;});},
  title:function(t){return t.name+' \u00b7 Team ID '+t.teamId;},
  fields:[
    {k:'name',label:'Team Name',req:true},
    {k:'teamId',label:'Team ID',readonly:true,hint:'System generated'},
    {k:'dept',label:'Department',type:'select',opts:function(){return sbUniq(teamsData,'dept');}},
    {k:'country',label:'Country',type:'select',opts:function(){return sbUniq(teamsData,'country');}},
    {k:'email',label:'Team Email',type:'email'},
    {k:'status',label:'Status',type:'select',opts:SB_ACTIVE}
  ]});
sbEditReg('pm',{prefix:'pm',render:renderPmSidebar,noun:'Payment',
  get:function(id){return paymentsData.find(function(p){return p.id===id;});},
  title:function(p){return 'Order #'+p.orderId;},
  fields:[
    {k:'key',label:'Key',readonly:true,hint:'System generated'},
    {k:'dealId',label:'Deal ID',readonly:true,hint:'From the deal'},
    {k:'entityName',label:'Entity Name',req:true},
    {k:'addedFrom',label:'Added From'},
    {k:'courseId',label:'Course ID'},
    {k:'courseName',label:'Course Name'},
    {k:'startFrom',label:'Start From',type:'date'},
    {k:'endTo',label:'End To',type:'date'},
    {k:'workingCountry',label:'Working Country',type:'select',opts:function(){return sbUniq(paymentsData,'workingCountry');}},
    {k:'orderCategory',label:'Order Category',type:'select',opts:function(){return sbUniq(paymentsData,'orderCategory',['domestic','international']);}}
  ]});
/* The same order's Sales Details tab. Its fields live on p.sales, so that is
   the record this editor edits. Payment Cycle is the one field with a rule of
   its own (js/ts-billing.js): it cannot move while timesheets on the order are
   waiting on approval, and moving it clears a selection made under the old
   cycle. Rate is read-only once the order has a rate schedule — the schedule
   is where a rate change is dated. */
let pmsCycleWas=null;
sbEditReg('pms',{prefix:'pm',render:renderPmSidebar,noun:'Sales details',
  get:function(id){const p=paymentsData.find(function(x){return x.id===id;});return p?(p.sales||(p.sales={})):null;},
  title:function(s,id){const p=paymentsData.find(function(x){return x.id===id;});return p?'Order #'+p.orderId:'';},
  check:function(s,id){
    pmsCycleWas=tsCycleOf(s.paymentCycle);
    const next=sbVal('sbed-pms-paymentCycle');
    if(next&&next!==pmsCycleWas&&tsbCycleBlocked(id)){
      showToast('Payment cycle not changed','error','Timesheets on this order are waiting on approval. Approve or reject them first.');
      return false;
    }
  },
  saved:function(s,id){
    if(tsCycleOf(s.paymentCycle)===pmsCycleWas)return;
    const why=tsbCycleChanged(id,s.paymentCycle);   // clears the old cycle's selection now
    // Said after the save's own "updated" toast, so it is the one left on top.
    setTimeout(function(){showToast('Payment cycle set to '+s.paymentCycle,'info',why);},0);
  },
  fields:function(s){
    const scheduled=(s.rateSchedule||[]).length>0;
    return [
      {k:'companyId',label:'Company ID',readonly:true,hint:'From the company'},
      {k:'companyName',label:'Company Name',req:true},
      {k:'contactPersonId',label:'Contact Person ID',readonly:true,hint:'From the contact'},
      {k:'contactPersonName',label:'Contact Person Name'},
      {k:'rateType',label:'Rate Type',type:'select',opts:['Hourly','Daily','Weekly','Monthly']},
      {k:'paymentCycle',label:'Payment Cycle',type:'select',opts:TS_CYCLES.map(function(c){return c.v;}),hints:TS_CYCLE_HINTS,req:true},
      scheduled?{k:'rate',label:'Rate',readonly:true,hint:'Set by the rate schedule'}:{k:'rate',label:'Rate'},
      {k:'days',label:'Days',type:'number'},
      {k:'totalAmount',label:'Total Amount'},
      {k:'contractPeriod',label:'Contract Period'},
      {k:'workLocation',label:'Work Location'},
      {k:'tsPeriodDate',label:'Timesheet Period Date'},
      {k:'paymentTerm',label:'Payment Term'}
    ];
  }});
sbEditReg('ct',{prefix:'ct',render:renderCtSidebar,noun:'Contract',
  get:function(id){return contractsData.find(function(c){return c.id===id;});},
  title:function(c){return c.empName+' \u00b7 Contract '+c.contractId;},
  fields:[
    {k:'empName',label:'Name',req:true},
    {k:'gender',label:'Gender',type:'select',opts:['MALE','FEMALE','OTHER']},
    {k:'nationality',label:'Nationality',type:'select',opts:function(){return sbUniq(contractsData,'nationality');}},
    {k:'countryOfOp',label:'Country of Operation',type:'select',opts:function(){return sbUniq(contractsData,'countryOfOp');}},
    {k:'workPermit',label:'Work Permit',type:'bool'},
    {k:'email',label:'Email ID',type:'email',req:true},
    {k:'contact',label:'Contact Number',type:'tel'},
    {k:'dob',label:'Date of Birth',type:'isodate'},
    {k:'jobTitle',label:'Job Title'},
    {k:'skill',label:'Skill'},
    {k:'empDuration',label:'Employment Duration'},
    {k:'empType',label:'Employment Type',type:'select',opts:function(){return sbUniq(contractsData,'empType');}},
    {k:'workSchedule',label:'Work Schedule',type:'number'},
    {k:'payAmount',label:'Pay Amount',type:'number'},
    {k:'currency',label:'Currency',type:'select',opts:function(){return sbUniq(contractsData,'currency');}},
    {k:'payFrequency',label:'Pay Frequency',type:'select',opts:function(){return sbUniq(contractsData,'payFrequency',['Monthly','Bi-weekly','Weekly']);}},
    {k:'jobDesc',label:'Job Description',type:'textarea',full:true}
  ]});
sbEditReg('cmp',{prefix:'cmp',render:renderComplianceSidebar,noun:'Compliance requirement',
  get:function(id){return complianceItemsData.find(function(x){return x.id===id;});},
  title:function(x){return x.item+' \u00b7 '+x.country;},
  fields:[
    {k:'item',label:'Requirement',req:true,full:true},
    {k:'country',label:'Country',type:'select',opts:function(){return sbUniq(complianceItemsData,'country');}},
    {k:'model',label:'Employment Model',type:'select',opts:function(){return sbUniq(complianceItemsData,'model',['EOR','PEO']);}},
    {k:'category',label:'Category',type:'select',opts:function(){return sbUniq(complianceItemsData,'category');}},
    {k:'status',label:'Status',type:'select',opts:SB_ACTIVE},
    {k:'mandatory',label:'Mandatory',type:'bool'},
    {k:'payrollBlocking',label:'Payroll Blocking',type:'bool'},
    {k:'evidenceRequired',label:'Evidence Required',type:'bool'}
  ]});
sbEditReg('rr',{prefix:'rr',render:renderRatesRuleSidebar,noun:'Rate / rule',
  get:function(id){return ratesRulesData.find(function(x){return x.id===id;});},
  title:function(x){return x.ruleName+' \u00b7 '+x.country;},
  fields:[
    {k:'ruleName',label:'Rule Name',req:true,full:true},
    {k:'country',label:'Country',type:'select',opts:function(){return sbUniq(ratesRulesData,'country');}},
    {k:'category',label:'Category',type:'select',opts:function(){return sbUniq(ratesRulesData,'category');}},
    {k:'applicableTo',label:'Applicable To',type:'select',opts:function(){return sbUniq(ratesRulesData,'applicableTo');}},
    {k:'valueRate',label:'Value / Rate',req:true},
    {k:'status',label:'Status',type:'select',opts:SB_ACTIVE}
  ]});
sbEditReg('ctp',{prefix:'ctp',render:renderCtpSidebar,noun:'Contract template',
  get:function(id){return contractTemplatesData.find(function(x){return x.id===id;});},
  title:function(x){return x.templateName+' \u00b7 Template ID '+x.templateId;},
  fields:[
    {k:'templateName',label:'Template Name',req:true},
    {k:'templateId',label:'Template ID',readonly:true,hint:'System generated'},
    {k:'employmentType',label:'Employment Type',type:'select',opts:function(){return sbUniq(contractTemplatesData,'employmentType',['EOR','PEO']);}},
    {k:'category',label:'Category',type:'select',opts:function(){return sbUniq(contractTemplatesData,'category');}},
    {k:'country',label:'Country',type:'select',opts:function(){return sbUniq(contractTemplatesData,'country');}},
    {k:'status',label:'Status',type:'select',opts:SB_ACTIVE}
  ]});
/* The generic panel edits the row it was built from, one field per column -
   a cell that holds markup (a chip, a link) is shown but not offered. */
sbEditReg('lst',{prefix:'lst',render:renderLstSidebar,
  get:function(){return getLstSelectedRow();},
  get noun(){const m=getPageMeta(lstSelectedPg);return lstNouns[lstSelectedPg]||String(m.title||'Record').replace(/s$/,'');},
  title:function(row){const v=row.find(function(x,ci){const c=(getPageMeta(lstSelectedPg).columns||[])[ci];return x&&!/^S\.? ?No$/.test(c);});return String(v||'').replace(/<[^>]*>/g,'');},
  fields:function(row){
    const cols=getPageMeta(lstSelectedPg).columns||[];
    return cols.map(function(c,ci){
      if(/^S\.? ?No$/.test(c)||/^action$/i.test(c))return null;
      const raw=String(row[ci]==null?'':row[ci]);
      if(/</.test(raw))return {k:ci,label:c,readonly:true,hint:'Not editable here'};
      if(/^status$/i.test(c))return {k:ci,label:c,type:'select',opts:function(){
        return sbUniq((getPageMeta(lstSelectedPg).rows||[]).map(function(r){return {v:r[ci]};}),'v',[raw]);}};
      return {k:ci,label:c,req:ci===cols.findIndex(function(x){return !/^S\.? ?No$/.test(x);})};
    }).filter(Boolean);
  }});

/* How each panel leaves edit mode when its unsaved changes are discarded. */
sbDraftReg('de',{drop:function(){deEditMode=false;}});
sbDraftReg('ge',{drop:function(){geEditMode=false;}});
sbDraftReg('hd',{drop:function(){hdEditMode=false;}});
sbDraftReg('lp',{drop:function(){lpSidebarEditMode=false;}});
['tm','pm','ct','cmp','rr','ctp','lst'].forEach(function(p){sbDraftReg(p,{drop:function(){sbEditing=null;}});});
