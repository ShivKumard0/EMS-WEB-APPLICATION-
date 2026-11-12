/* ══ COMPANY SETTINGS: AGREEMENTS IN THE ATTACHMENTS TAB ═════════════════════
   The entity's Attachments tab used to be a drop zone and nothing else. An
   entity also carries two documents that are not uploaded but GENERATED from
   what we know about the client - the Master Service Agreement and the
   Non-Disclosure Agreement - so the tab is now one listing with both kinds of
   row in it:

     AGREEMENT ROWS  always present. Until generated they carry a Generate
                     button (with a dot: something is waiting on you); after,
                     a status and View / Download.
     UPLOADED ROWS   the files someone attached, exactly as before.

   Generate opens the shared .ct-modal--form popup in three steps, one modal:

     1 DETAILS   the agreement's fields in one plain grid, ordered by who they
                 describe - the agreement, the ADT party, the client party, the
                 governing law - so "Client ID Label" sits beside the "Client
                 ID Number" it labels.
     2 PREVIEW   the document built from those fields, editable in place for
                 the one-off wording change legal always asks for.
     3 DONE      the confirmation. The row flips to Pending Approval.

   The modal is mounted on its own host under <body> rather than through
   renderADTPage(), so opening it does not repaint the listing and the side
   panel underneath - the panel keeps its tab, its scroll and its state. */

const CSAG_X='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
const CSAG_ICO={
  doc:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  file:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  dl:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  eye:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  bin:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  plus:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  spark:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/></svg>',
  pen:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  back:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  check:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
};

/* The entity this panel describes - Basic Details names it. Generated files
   are named after it, which is what the mock-up's [Entity_Name_MSA] meant. */
const CSAG_ENTITY='Closedhi';

/* The two agreements. `purpose`/`term` are the only fields whose WORDING
   differs between them: an NDA states why information is disclosed, an MSA
   states what services are provided. Same slot, same position, right label. */
const CS_AGREEMENTS=[
  {key:'MSA',title:'Master Service Agreement',by:'Shrikant Ghagre',source:'Web',
   purposeLabel:'Scope of Services',purposePh:'e.g. EOR and PEO services across APAC',termLabel:'MSA Term (Years)',
   status:'pending',values:null,docHtml:null,generatedOn:null},
  {key:'NDA',title:'Non-Disclosure Agreement',by:'Shrikant Ghagre',source:'Web',
   purposeLabel:'Purpose of Disclosure',purposePh:'e.g. Evaluation of ADT EOR / PEO services',termLabel:'NDA Term (Years)',
   status:'pending',values:null,docHtml:null,generatedOn:null}
];
function csagFind(key){return CS_AGREEMENTS.find(function(a){return a.key===key;});}
function csagFileName(a){return CSAG_ENTITY+'_'+a.key;}

/* Signatories come with their title, so picking one fills the next field in -
   the mock-up asked for both by hand, which is how they end up disagreeing. */
const CSAG_SIGNATORIES={
  'Shaun Mathew':'Director',
  'Pallavi Parate':'Head of HR',
  'Shrikant Ghagre':'Chief Financial Officer'
};
const CSAG_COUNTERPARTY=['Private Limited Company','Public Limited Company','Limited Liability Partnership','Partnership Firm','Sole Proprietorship','Individual'];
const CSAG_LANGUAGES=['English','Dutch','French','German','Spanish','Hindi'];

/* ── The form, as data ─────────────────────────────────────────────────────
   Grouped only to fix the ORDER fields appear in - no headings are drawn. `w:'full'` for the
   two values that are sentences rather than words. `req` mirrors the mock-up's
   asterisks exactly - nothing here is made more or less mandatory than spec'd. */
function csagSections(a){
  /* Ordered so the two-column grid pairs related fields on each row -
     Client ID Label beside Client ID Number, each signatory beside their
     title - with the one unpaired field (Language) last. */
  return [
    {title:'Agreement',fields:[
      {k:'entity',label:'ADT Entity',type:'select',req:true,opts:function(){return entitiesData.map(function(e){return e.name;});},ph:'Select Entity',def:CSAG_ENTITY},
      {k:'entityIdLabel',label:'Entity ID Label',type:'text',ph:'e.g. PAN / CIN'},
      {k:'date',label:'Agreement Date',type:'date',req:true},
      {k:'term',label:a.termLabel,type:'number',req:true,ph:'e.g. 2',min:1},
      {k:'purpose',label:a.purposeLabel,type:'text',req:true,ph:a.purposePh,w:'full'}
    ]},
    {title:'ADT Party',fields:[
      {k:'sig',label:'Company Signatory',type:'select',req:true,opts:function(){return Object.keys(CSAG_SIGNATORIES);},ph:'Select Signatory',hook:'csagSigPicked'},
      {k:'sigTitle',label:'Company Signatory Title',type:'text',req:true,ph:'e.g. Director'}
    ]},
    {title:'Client Party',fields:[
      {k:'clientName',label:'Client Legal Name',type:'text',ph:'e.g. Manpower Management Services'},
      {k:'counterparty',label:'Counterparty Type',type:'select',opts:function(){return CSAG_COUNTERPARTY;},ph:'Select Type'},
      {k:'clientIdLabel',label:'Client ID Label',type:'text',req:true,ph:'e.g. Company Registration Number'},
      {k:'clientId',label:'Client ID Number',type:'text',req:true,ph:'e.g. U1234567'},
      {k:'clientAddr',label:'Client Registered Address',type:'textarea',req:true,ph:'Street, city, postcode, country',w:'full'},
      {k:'clientSig',label:'Client Signatory Name',type:'text',req:true,ph:'Full name'},
      {k:'clientSigTitle',label:'Client Signatory Title',type:'text',req:true,ph:'e.g. Managing Director'}
    ]},
    {title:'Governing Law & Disputes',fields:[
      {k:'law',label:'Governing Law',type:'text',req:true,ph:'e.g. Republic of Singapore'},
      {k:'court',label:'Court City',type:'text',req:true,ph:'e.g. Singapore'},
      {k:'seat',label:'Arbitration Seat',type:'text',req:true,ph:'e.g. Singapore'},
      {k:'rules',label:'Arbitration Rules',type:'text',ph:'e.g. SIAC Rules'},
      {k:'language',label:'Language',type:'select',opts:function(){return CSAG_LANGUAGES;},ph:'Select Language',def:'English'}
    ]}
  ];
}
function csagFields(a){return csagSections(a).reduce(function(o,s){return o.concat(s.fields);},[]);}
function csagId(k){return 'csag-f-'+k;}

/* ── State + mounting ──────────────────────────────────────────────────── */
let csagState=null;   // {key, step:'form'|'preview'|'done', values, editing}
function csagHost(){
  let h=document.getElementById('csag-host');
  if(!h){h=document.createElement('div');h.id='csag-host';document.body.appendChild(h);}
  return h;
}
function csagPaint(){
  const h=csagHost();
  h.innerHTML=csagState?csagModalHTML():'';
  if(csagState&&csagState.step==='form'){
    const first=h.querySelector('input.ep-form-input,textarea.ep-form-input');
    if(first&&!csagState.values)first.focus({preventScroll:true});
  }
}
function csagTodayIso(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

function csagOpen(key){
  const a=csagFind(key);if(!a)return;
  csagState={key:key,step:'form',values:a.values?Object.assign({},a.values):null,editing:false};
  csagPaint();
}
/* View re-opens a generated agreement straight on its document. */
function csagView(key){
  const a=csagFind(key);if(!a||!a.values)return csagOpen(key);
  csagState={key:key,step:'preview',values:Object.assign({},a.values),editing:false,readOnly:true};
  csagPaint();
}
function csagClose(){csagState=null;csagPaint();}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&csagState)csagClose();});

/* apCS hook: picking a signatory writes their title, unless someone has
   already typed a different one. */
function csagSigPicked(val){
  const t=document.getElementById(csagId('sigTitle'));
  if(t&&(!t.value||t.dataset.auto==='1')){t.value=CSAG_SIGNATORIES[val]||'';t.dataset.auto='1';}
}

/* ── Step 1: the form ──────────────────────────────────────────────────── */
function csagControl(f,v){
  const id=csagId(f.k),val=v!=null?v:(f.def||'');
  if(f.type==='select')return apCS(id,f.opts(),val,f.ph||'Select',f.hook);
  if(f.type==='date')return apCD(id,val||csagTodayIso(),'Select date');
  if(f.type==='textarea')return '<textarea class="ep-form-input csag-textarea" id="'+id+'" rows="2" placeholder="'+attrSafe(f.ph||'')+'">'+sbEsc(val)+'</textarea>';
  return '<input class="ep-form-input" id="'+id+'" type="'+(f.type==='number'?'number':'text')+'"'
    +(f.min?' min="'+f.min+'" step="1"':'')+' placeholder="'+attrSafe(f.ph||'')+'" value="'+attrSafe(val)+'"'
    +(f.k==='sigTitle'?' oninput="this.dataset.auto=\'0\'"':'')+'>';
}
function csagFormHTML(a){
  const vals=csagState.values||{};
  return '<div class="ep-form-grid">'+csagFields(a).map(function(f){
    return '<div class="ep-form-group'+(f.w==='full'?' ep-form-full':'')+'" data-csag-k="'+f.k+'">'
      +'<label class="ep-form-label" for="'+csagId(f.k)+'">'+f.label+(f.req?' <span class="req">*</span>':'')+'</label>'
      +csagControl(f,vals[f.k])+'</div>';
  }).join('')+'</div>';
}
function csagRead(a){
  const out={};
  csagFields(a).forEach(function(f){
    const id=csagId(f.k);
    if(f.type==='select')out[f.k]=getCSValue(id);
    else if(f.type==='date')out[f.k]=getCDValue(id);
    else{const el=document.getElementById(id);out[f.k]=el?el.value.trim():'';}
  });
  return out;
}
/* Every missing field is marked at once, and the first one is scrolled to -
   one toast per missing field would be nineteen toasts. */
function csagValidate(a,vals){
  const missing=[];
  document.querySelectorAll('#csag-host .csag-invalid').forEach(function(g){g.classList.remove('csag-invalid');});
  csagFields(a).forEach(function(f){
    let bad=f.req&&!vals[f.k];
    if(!bad&&f.type==='number'&&vals[f.k]&&!(Number(vals[f.k])>=1))bad=true;
    if(bad){
      missing.push(f.label);
      const g=document.querySelector('#csag-host [data-csag-k="'+f.k+'"]');if(g)g.classList.add('csag-invalid');
    }
  });
  if(missing.length){
    const g=document.querySelector('#csag-host .csag-invalid');
    if(g)g.scrollIntoView({block:'center',behavior:'smooth'});
    showToast('Some details are missing','error',missing.length===1?missing[0]+' is required.':missing.length+' required fields — first: '+missing[0]+'.');
  }
  return !missing.length;
}
/* Typing into a flagged field clears its flag. */
document.addEventListener('input',function(e){
  const g=e.target.closest&&e.target.closest('#csag-host .csag-invalid');if(g)g.classList.remove('csag-invalid');
});
document.addEventListener('click',function(e){
  const g=e.target.closest&&e.target.closest('#csag-host .csag-invalid .cs-option,#csag-host .csag-invalid .cd-day');
  if(g){const grp=g.closest('.csag-invalid');if(grp)setTimeout(function(){grp.classList.remove('csag-invalid');},0);}
});

function csagToPreview(){
  const a=csagFind(csagState.key);
  const vals=csagRead(a);
  if(!csagValidate(a,vals))return;
  /* Edited wording belongs to the values it was written against. Changing a
     field throws it away rather than silently keeping a stale sentence. */
  const prev=a.values&&JSON.stringify(a.values);
  if(a.docHtml&&prev!==JSON.stringify(vals))a.docHtml=null;
  csagState.values=vals;csagState.step='preview';csagState.editing=false;
  csagPaint();
}
function csagBackToForm(){csagCaptureEdits();csagState.step='form';csagState.editing=false;csagPaint();}

/* ── Step 2: the document ──────────────────────────────────────────────── */
function csagEsc(v,fallback){return v?sbEsc(v):'<span class="csag-blank">'+(fallback||'—')+'</span>';}
function csagDocHTML(a,v){
  const date=v.date?cdLabel(v.date):'';
  const ent=entitiesData.find(function(e){return e.name===v.entity;})||{};
  const client=csagEsc(v.clientName,'the Client');
  const idLbl=v.entityIdLabel?sbEsc(v.entityIdLabel):'Entity ID';
  const years=v.term+' year'+(Number(v.term)===1?'':'s');
  const party='<p class="adt-doc-clause"><b>ADT '+sbEsc(v.entity)+'</b>, a company having '+idLbl+' '+sbEsc(ent.entityId||'—')
      +', with its registered office in '+sbEsc(ent.country||'—')+' (hereinafter referred to as the "Company") of the FIRST PART;</p>'
    +'<p class="adt-doc-clause csag-doc-and">AND</p>'
    +'<p class="adt-doc-clause"><b>'+client+'</b>'+(v.counterparty?', a '+sbEsc(v.counterparty):'')+', having '+sbEsc(v.clientIdLabel)+' ('+sbEsc(v.clientId)
      +') and its registered office at '+sbEsc(v.clientAddr)+' (hereinafter referred to as the "Client") of the SECOND PART.</p>'
    +'<p class="adt-doc-clause">The Company and the Client are individually referred to as a "Party" and collectively as the "Parties".</p>';
  const body=a.key==='NDA'
    ? '<p class="adt-doc-clause"><b>1. Purpose.</b> The Parties wish to exchange confidential information for the following purpose: '+sbEsc(v.purpose)+'.</p>'
      +'<p class="adt-doc-clause"><b>2. Confidentiality.</b> Each Party shall hold the other\'s confidential information in strict confidence, use it solely for the Purpose, and disclose it only to those of its personnel who need to know it for the Purpose.</p>'
      +'<p class="adt-doc-clause"><b>3. Term.</b> This Agreement is effective for '+years+' from the Commencement Date, and the obligations of confidentiality survive its expiry.</p>'
    : '<p class="adt-doc-clause"><b>1. Services.</b> The Company shall provide the Client with the following services: '+sbEsc(v.purpose)+', as further described in the Statements of Work agreed between the Parties.</p>'
      +'<p class="adt-doc-clause"><b>2. Fees.</b> The Client shall pay the fees set out in each Statement of Work, invoiced monthly in arrears and payable within thirty (30) days of invoice.</p>'
      +'<p class="adt-doc-clause"><b>3. Term.</b> This Agreement is effective for '+years+' from the Commencement Date and renews for successive one-year terms unless either Party gives ninety (90) days\' written notice.</p>';
  const law='<p class="adt-doc-clause"><b>4. Governing Law.</b> This Agreement is governed by and construed in accordance with the laws of '+sbEsc(v.law)
      +'. The courts of '+sbEsc(v.court)+' shall have exclusive jurisdiction.</p>'
    +'<p class="adt-doc-clause"><b>5. Dispute Resolution.</b> Any dispute arising out of this Agreement shall be finally resolved by arbitration seated in '+sbEsc(v.seat)
      +(v.rules?' under the '+sbEsc(v.rules):'')+', conducted in '+sbEsc(v.language||'English')+'.</p>';
  return '<div class="adt-doc-page csag-doc">'
    +'<div class="csag-doc-title">'+a.title+'</div>'
    +'<p class="adt-doc-clause">THIS '+a.title.toUpperCase()+' ("Agreement") is made and entered into as of '+sbEsc(date)+' (the "Commencement Date") by and between:</p>'
    +party+body+law
    +'<div class="adt-doc-sig-row">'
      +'<div class="adt-doc-sig-block">'+sbEsc(v.sig)+'<div class="adt-doc-sig-label">'+sbEsc(v.sigTitle)+' &middot; for ADT '+sbEsc(v.entity)+'</div></div>'
      +'<div class="adt-doc-sig-block">'+sbEsc(v.clientSig)+'<div class="adt-doc-sig-label">'+sbEsc(v.clientSigTitle)+' &middot; for '+client+'</div></div>'
    +'</div></div>';
}
function csagPreviewHTML(a){
  const html=a.docHtml&&!csagState.readOnly?a.docHtml:(a.docHtml||csagDocHTML(a,csagState.values));
  const ed=csagState.editing;
  return '<div class="csag-prev-bar">'
      +'<span class="csag-prev-note">'+(ed?'Editing the document. Changes apply to this agreement only.':'Built from the details you entered.')+'</span>'
      +(csagState.readOnly?'':'<button type="button" class="att-link'+(ed?' is-on':'')+'" onclick="csagToggleEdit()">'+CSAG_ICO.pen+(ed?'Done editing':'Edit document')+'</button>')
    +'</div>'
    +(ed?'<div class="csag-tools">'
      +['bold:B','italic:I','underline:U'].map(function(t){const p=t.split(':');return '<button type="button" class="csag-tool csag-tool-'+p[0]+'" onmousedown="event.preventDefault();document.execCommand(\''+p[0]+'\')">'+p[1]+'</button>';}).join('')
      +'<span class="csag-tool-sep"></span>'
      +'<button type="button" class="csag-tool" onmousedown="event.preventDefault();document.execCommand(\'insertUnorderedList\')">• List</button>'
      +'</div>':'')
    +'<div class="csag-doc-wrap'+(ed?' is-editing':'')+'" id="csag-doc"'+(ed?' contenteditable="true" spellcheck="true"':'')+'>'+html+'</div>';
}
function csagCaptureEdits(){
  const d=document.getElementById('csag-doc');
  if(d&&csagState&&csagState.editing)csagFind(csagState.key).docHtml=d.innerHTML;
}
function csagToggleEdit(){
  csagCaptureEdits();
  const a=csagFind(csagState.key);
  if(!a.docHtml){const d=document.getElementById('csag-doc');if(d)a.docHtml=d.innerHTML;}
  csagState.editing=!csagState.editing;
  csagPaint();
  if(csagState.editing){const d=document.getElementById('csag-doc');if(d)d.focus();}
}
function csagDownload(){
  showToast('Preparing PDF','success',csagFileName(csagFind(csagState?csagState.key:'MSA'))+'.pdf will download shortly.');
}
function csagDownloadRow(key){showToast('Preparing PDF','success',csagFileName(csagFind(key))+'.pdf will download shortly.');}

function csagSubmit(){
  csagCaptureEdits();
  const a=csagFind(csagState.key);
  const s=stampNow();
  a.values=Object.assign({},csagState.values);
  a.status='approval';a.generatedOn=s.date;a.by=CURRENT_USER;
  csagState.step='done';csagState.editing=false;
  csagPaint();
  if(typeof refreshCsSidebar==='function'&&csSelectedItem!=null&&csTab==='attachments')refreshCsSidebar();
}

/* ── The modal shell ───────────────────────────────────────────────────── */
function csagModalHTML(){
  const a=csagFind(csagState.key);
  const st=csagState.step;
  if(st==='done'){
    return '<div class="ct-modal-overlay">'
      +'<div class="ct-modal csag-done" role="dialog" aria-modal="true" aria-label="'+a.key+' generated" onclick="event.stopPropagation()">'
      +'<button class="ct-modal-close csag-done-x" onclick="csagClose()" aria-label="Close">'+CSAG_X+'</button>'
      +'<div class="csag-done-ico">'+CSAG_ICO.check+'</div>'
      +'<div class="csag-done-title">'+a.key+' has been generated</div>'
      +'<p class="csag-done-sub">'+sbEsc(csagFileName(a))+' is in Attachments and has gone to approval. You\'ll be notified once it\'s approved.</p>'
      +'<div class="csag-done-btns">'
        +'<button class="ep-cancel-btn" onclick="csagDownload()">'+CSAG_ICO.dl+' Download PDF</button>'
        +'<button class="ep-save-btn" onclick="csagClose()">Done</button>'
      +'</div></div></div>';
  }
  const statusChip=csagState.readOnly?' <span class="lp-status-badge tone-wait">Pending Approval</span>':'';
  let body,foot;
  if(st==='form'){
    body=csagFormHTML(a);
    foot='<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="csagClose()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="csagToPreview()">Preview '+a.key+'</button>'
      +'</div></div>';
  }else{
    body=csagPreviewHTML(a);
    foot='<div class="ct-modal-foot">'
      +(csagState.readOnly?'<span></span>':'<button class="add-link csag-back" onclick="csagBackToForm()">'+CSAG_ICO.back+' Back to details</button>')
      +'<div class="ct-modal-btns">'
        +'<button class="ep-cancel-btn" onclick="csagDownload()">'+CSAG_ICO.dl+' Download PDF</button>'
        +(csagState.readOnly
          ?'<button class="ep-save-btn" onclick="csagClose()">Close</button>'
          :'<button class="ep-save-btn" onclick="csagSubmit()">Send for Approval</button>')
      +'</div></div>';
  }
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form csag-modal'+(body.indexOf('csag-doc-wrap')>=0?' is-preview':'')+'" role="dialog" aria-modal="true" aria-label="Generate '+a.key+'" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+(csagState.readOnly?a.title:'Generate '+a.key)+statusChip+'</span>'
      +'<button class="ct-modal-close" onclick="csagClose()" aria-label="Close">'+CSAG_X+'</button></div>'
    +'<div class="csag-subrow"><p class="ct-modal-sub">'+(csagState.readOnly
        ?sbEsc(csagFileName(a))+' &middot; generated '+sbEsc(a.generatedOn||'')+' by '+sbEsc(a.by)
        :a.title+' for '+CSAG_ENTITY+'. Fields marked <span class="req">*</span> are required.')+'</p></div>'
    +'<div class="csag-body">'+body+'</div>'
    +foot
    +'</div></div>';
}

/* ── The Attachments tab ───────────────────────────────────────────────── */
function csAttachmentsTabHTML(){
  const rec=attachRec('cs','entity');
  const files=rec?rec.attachments:[];
  const dz='ondragover="attachDrag(event,true)" ondragleave="attachDrag(event,false)" ondrop="attachDrop(event,\'cs\',\'entity\')" '
    +'onclick="attachPick(\'cs\',\'entity\')" onkeydown="attachKey(event,\'cs\',\'entity\')" role="button" tabindex="0"';
  const agRows=CS_AGREEMENTS.map(function(a,i){
    const done=a.status!=='pending';
    return '<tr class="csag-row">'
      +'<td class="csag-td csag-num">'+(i+1)+'</td>'
      +'<td class="csag-td"><div class="csag-file-txt"><div class="lp-c-main" title="'+attrSafe(csagFileName(a))+'">'+sbEsc(csagFileName(a))+'</div>'
        +'<div class="lp-c-sub">'+(done?(a.key==='MSA'?'184 KB':'142 KB'):a.title)+'</div></div></td>'
      +'<td class="csag-td">'+sbEsc(a.by)+'</td>'
      +'<td class="csag-td"><span class="att-kind">'+a.key+'</span></td>'
      +'<td class="csag-td csag-src">'+(done?'Generated':sbEsc(a.source))+'</td>'
      /* Status, then the file's own actions, then e-sign - left to right in the
         order they are needed. The chip and the e-sign controls come from
         esign.js; the typeof guards keep this tab working if that file is not
         loaded, in which case the row behaves exactly as it did before. */
      +'<td class="csag-td csag-act">'+(done
        ?(typeof esAgStatusChip==='function'?esAgStatusChip(a):'<span class="lp-status-badge tone-wait csag-row-status">Draft Generated</span>')
          +'<button class="att-row-btn" title="View" onclick="csagView(\''+a.key+'\')">'+CSAG_ICO.eye+'</button>'
          +'<button class="att-row-btn" title="Download" onclick="csagDownloadRow(\''+a.key+'\')">'+CSAG_ICO.dl+'</button>'
          +(typeof esAgActionCell==='function'?esAgActionCell(a):'')
        :'<button class="csag-gen-btn" onclick="csagOpen(\''+a.key+'\')" title="Generate the '+a.title+'"><span class="csag-gen-dot"></span>'+CSAG_ICO.spark+'Generate</button>')
      +'</td></tr>';
  }).join('');
  const fileRows=files.map(function(f,i){
    return '<tr>'
      +'<td class="csag-td csag-num">'+(CS_AGREEMENTS.length+i+1)+'</td>'
      +'<td class="csag-td"><div class="csag-file-txt"><div class="lp-c-main" title="'+attrSafe(f.name)+'">'+sbEsc(f.name)+'</div>'
        +'<div class="lp-c-sub">'+(f.size||'—')+'</div></div></td>'
      +'<td class="csag-td">'+sbEsc(f.by||'—')+'</td>'
      +'<td class="csag-td"><span class="att-kind">'+sbEsc(f.type||attachKind(f.name))+'</span></td>'
      +'<td class="csag-td csag-src">'+sbEsc(f.source||'—')+'</td>'
      /* Same shape as the agreement row above, so an uploaded MSA and a
         generated NDA are sent for signature from the same place, in the same
         way, and report their status in the same column. */
      +'<td class="csag-td csag-act">'
        +(typeof esUpStatusChip==='function'?esUpStatusChip(f):'')
        +'<button class="att-row-btn" title="Download" onclick="attachOpen('+attrSafe(JSON.stringify(f.name))+')">'+CSAG_ICO.dl+'</button>'
        +'<button class="att-row-btn is-danger" title="Remove" onclick="attachRemove(\'cs\',\'entity\','+i+')">'+CSAG_ICO.bin+'</button>'
        +(typeof esUpActionCell==='function'?esUpActionCell(f):'')
      +'</td></tr>';
  }).join('');
  /* Same bar, slim drop zone and table as every other Attachments tab (see
     attachTabHTML in pages.js) - only the agreement rows are extra. */
  const n=CS_AGREEMENTS.length+files.length;
  return '<div class="att-bar">'
      +'<span class="att-count">'+n+' file'+(n===1?'':'s')+'</span>'
      +'<div class="att-bar-actions">'
        +'<button class="att-link" onclick="attachDownloadAll(\'cs\',\'entity\')">'+CSAG_ICO.dl+'Download All</button>'
      +'</div></div>'
    +'<div class="att-zone att-zone-sm" '+dz+'>'
      +'<span class="att-zone-ico-sm">'+CSAG_ICO.up+'</span>'
      +'<span>Drop files here, or click to browse</span></div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table csag-table--files"><thead><tr>'
      +'<th>Sr. No</th><th>File Name</th><th>Uploaded By</th><th>Type</th><th>Source</th><th class="csag-act">Action</th>'
    +'</tr></thead><tbody>'+agRows+fileRows+'</tbody></table></div>';
}
