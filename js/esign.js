/* ══ E-SIGNING THROUGH DOCUSEAL (US 7-11) ═════════════════════════════════
   WHAT THIS FILE IS. A mock of the DocuSeal integration, built so the whole
   flow can be walked through and signed off on screen before any of it is
   wired to a real provider. Nothing here talks to the network. Every id is
   minted locally, every webhook is delivered by a button, and the two places
   the written requirement is still open are marked in the UI rather than left
   to be remembered.

   WHERE THE WORK IS SPLIT, which is the point of the requirement:

     DOCUSEAL OWNS   the signing link, the signer's journey, the signature
                     itself, the signed PDF, the audit certificate, and the
                     webhook callbacks that report all of it.
     THE PLATFORM OWNS  generating or holding the document, choosing the
                     signatories, creating the submission, storing the
                     returned ids, tracking status, and keeping the signed
                     PDF and audit trail against the document record.

   So this file models exactly the platform's half, and fakes DocuSeal's half
   behind one seam - esApiCreateSubmission() and esDeliverWebhook(). Those two
   functions are the only places that pretend to be a provider. Replacing them
   with calls to a real backend is the whole of the real integration; nothing
   else in this file, and nothing in the UI, would need to change.

   WHY A BROWSER CANNOT DO THE REAL THING, recorded here so it is not
   rediscovered later: DocuSeal authenticates with an account-wide API token,
   which cannot live in client JavaScript, and it reports status by POSTing to
   a public URL, which a static page has no way to receive. Both halves need a
   server. The seam above is where that server goes.

   STATUS LIVES BESIDE THE EXISTING ONE, NOT ON TOP OF IT. A generated
   agreement already carries `status` ('pending' -> 'approval') from its own
   approval flow. E-sign state is a separate `esign` object on the same
   record, so sending a document for signature cannot disturb the approval
   flow that produced it, and the generate/preview/approve path in
   cs-agreements.js keeps working untouched. */

/* ── Icons ─────────────────────────────────────────────────────────────── */
const ES_ICO={
  pen:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
  send:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  cog:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.63.67 1.1 1.32 1.13H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  eye:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  dl:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  copy:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  warn:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  check:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
  lockSm:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  warnSm:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  lock:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  doc:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  shield:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
  bolt:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  refresh:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  plug:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0V8z"/><path d="M12 17v5"/></svg>',
  x:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  person:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  cal:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  /* 16px, 1.8 stroke, grey - the weight .lp-sb-field-icon is drawn at
     everywhere else in the app. */
  fId:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="7" y1="11" x2="10" y2="11"/><line x1="7" y1="15" x2="10" y2="15"/><path d="M14 11h3m-3 4h3"/></svg>',
  fHash:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
  fDoc:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  fFlag:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  fCal:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  fUser:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  fLink:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  clk:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
};

/* ── Who may do what (US7 "authorized internal roles", US10 "authorized
      users", US11 "authorized admins") ─────────────────────────────────────
   The signed-in user's role, read once. A real build takes this from the
   session's permissions; here it is the role Company Settings already shows
   for this user on its Roles & Access tab, so the two agree.

   There is deliberately no way to switch it from the UI. An earlier version
   had a "Preview as" control so the gates could be demonstrated, and it read
   as a product feature sitting in the middle of a settings screen. The gates
   are still here and still enforced - they are just wired to who you are,
   which is how they will work for real. */
const ES_ROLE=CURRENT_USER_ROLE;
const ES_SEND_ROLES=['Entity Super Admin','Opendhi Platform Admin','Account Manager','Sales Manager'];
const ES_DOWNLOAD_ROLES=ES_SEND_ROLES;
const ES_ADMIN_ROLES=['Entity Super Admin','Opendhi Platform Admin'];
function esCanSend(){return ES_SEND_ROLES.indexOf(ES_ROLE)>=0;}
function esCanDownload(){return ES_DOWNLOAD_ROLES.indexOf(ES_ROLE)>=0;}
function esCanConfigure(){return ES_ADMIN_ROLES.indexOf(ES_ROLE)>=0;}
/* Status is not gated. Hiding where a document has got to from the people who
   chase it is how a signature goes quiet for a week; only the ACTIONS are
   gated, per US7 "visible only to authorized internal roles". */
function esCanSeeEsign(){return true;}

/* ── The integration's configuration (US11) ────────────────────────────────
   Seeded connected, so the send flow can be demonstrated on first load. Every
   disabled/incomplete state in US7 and US8 is then reached by turning parts of
   this off from Platform Settings, which is the order a reviewer will want. */
const ES_PROVIDERS=['DocuSeal'];
const ES_ENVS=['Sandbox','Production'];
const ESIGN_CFG={
  provider:'DocuSeal',
  env:'Sandbox',
  baseUrl:'https://api.docuseal.com',
  apiKey:'dsk_live_7Xq2pR8mNv4TbW1aYc6HsJ',
  webhookSecret:'whsec_3Kp9Rt6Lm2Qv8Xz',
  webhookUrl:'https://api.opendhi.com/v1/webhooks/docuseal',
  enabled:true,
  connection:'ok',                 // 'untested' | 'ok' | 'fail'
  connectionMsg:'Connected to DocuSeal Sandbox as Opendhi Platform (workspace ws_4821).',
  workspace:'Opendhi Platform · ws_4821',
  testedOn:'24 Sep 2026 | 09:12 AM'
};
/* Required before the integration can be saved or used. US7/US8 call an
   integration with any of these empty "incomplete". */
const ES_REQUIRED=['provider','env','baseUrl','apiKey','webhookSecret'];
function esCfgComplete(){return ES_REQUIRED.every(function(k){return !!String(ESIGN_CFG[k]||'').trim();});}
function esCfgReady(){return ESIGN_CFG.enabled&&esCfgComplete();}

/* ── Status vocabulary ────────────────────────────────────────────────────
   Every status in US7-US10, and nothing else. `tone` picks the existing
   .lp-status-badge colour, so an e-sign status is the same species of pill as
   every other status in the app. */
const ES_STATUS={
  none           :{label:'Not Sent',                          tone:'idle'},
  sending        :{label:'Sending…',                          tone:'wait'},
  sent           :{label:'Sent for E-sign',                   tone:'wait'},
  viewed         :{label:'Viewed',                            tone:'info'},
  'signed-client':{label:'Signed by Client',                  tone:'info'},
  'signed-company':{label:'Signed by Company',                tone:'info'},
  executed       :{label:'Fully Executed',                    tone:'ok'},
  'sync-pending' :{label:'Fully Executed — File Sync Pending', tone:'wait'},
  declined       :{label:'Declined',                          tone:'bad'},
  expired        :{label:'Expired',                           tone:'bad'},
  failed         :{label:'Failed',                            tone:'bad'}
};
/* A generated agreement that has not been sent is not "Not Sent" - it is at
   the step its own flow left it at, which US7 names Draft Generated and makes
   the precondition for sending. */
function esStatusLabel(doc){
  const st=doc.esign.status;
  if(st==='none')return doc.kind==='agreement'?'Draft Generated':'Not Sent';
  return ES_STATUS[st].label;
}
function esStatusTone(doc){
  const st=doc.esign.status;
  if(st==='none')return doc.kind==='agreement'?'wait':'idle';
  return ES_STATUS[st].tone;
}
function esBadge(doc,extraClass){
  return '<span class="lp-status-badge tone-'+esStatusTone(doc)+(extraClass?' '+extraClass:'')+'">'
    +sbEsc(esStatusLabel(doc))+'</span>';
}
/* Statuses that still belong to DocuSeal: the platform is waiting, so it must
   not offer Send again and create a second submission for one document. */
function esInFlight(doc){
  return ['sending','sent','viewed','signed-client','signed-company'].indexOf(doc.esign.status)>=0;
}
function esIsDone(doc){return doc.esign.status==='executed'||doc.esign.status==='sync-pending';}

/* ── Signatory directory ──────────────────────────────────────────────────
   DocuSeal addresses a signer by email, and the generate form only ever asked
   for a name and a title. Rather than add two columns to a form that is
   already signed off, the company side is looked up here and the client side
   is asked for in the send popup, where it is actually needed. */
const ES_SIGNATORY_EMAIL={
  'Shaun Mathew':'shaun.varghese@opendhi.com',
  'Pallavi Parate':'pallavi.parate@opendhi.com',
  'Shrikant Ghagre':'shrikant.ghagre@opendhi.com'
};

/* ── The document registry ────────────────────────────────────────────────
   Two kinds of record can be e-signed and they are stored in two different
   places: a generated agreement in CS_AGREEMENTS, an uploaded file in the
   entity's attachments. Everything below the registry works on one shape, so
   no part of the UI has to know which kind it is looking at. */
let esUidSeq=0;
function esNewUid(p){esUidSeq++;return p+'-'+esUidSeq+'-'+Math.random().toString(36).slice(2,6);}
/* One e-sign record per document. Created on first read so nothing has to be
   migrated and older fixtures keep working. */
function esEnsure(rec){
  if(!rec.esign)rec.esign={
    status:'none',
    submissionId:null,documentId:null,templateId:null,slug:null,
    signingUrl:null,sentOn:null,sentBy:null,
    error:null,                     // the reason shown on Failed (US7)
    signers:[],
    signedAt:null,signedPdf:null,auditCert:null,
    syncAttempts:0,
    events:[],                      // webhook deliveries, newest first (US9)
    seen:[]                         // idempotency keys already processed (US9)
  };
  return rec.esign;
}
/* Agreements get a stable uid keyed off the agreement type, because there is
   exactly one MSA and one NDA per entity. */
if(typeof CS_AGREEMENTS!=='undefined'){
  CS_AGREEMENTS.forEach(function(a){a.uid='ag-'+a.key;});
}
/* An uploaded file needs a uid of its own: its index in the list shifts every
   time another file is added or removed, so an index is not an identity.
   attachCommit() stamps new uploads; this backfills anything already there. */
function esStampUpload(f){
  if(!f.uid)f.uid=esNewUid('up');
  /* US8 gates the action on "signing required". A PDF or Word document that
     someone attached to an entity is a candidate for signing; a spreadsheet or
     a screenshot is not, so the default answers the common case and stays
     changeable per file. */
  if(f.signingRequired==null)f.signingRequired=(f.type==='PDF'||f.type==='Document')?'Yes':'No';
  esEnsure(f);
  return f;
}
/* One uploaded MSA is seeded so US8 can be walked through without first having
   to attach a file - the story's own example starts from a client's MSA already
   being in the entity's Attachments. It is stamped like any other upload, so it
   behaves exactly as one the user drops in. Delete this block and the flow still
   works; it just starts one upload later. */
if(typeof csAttachHost!=='undefined'&&csAttachHost.attachments&&!csAttachHost.attachments.length){
  csAttachHost.attachments.push({
    name:'Kanan_Textiles_MSA_signed_copy.pdf',size:'212 KB',type:'PDF',
    by:'Pallavi Parate',source:'Manual upload',date:'23 Sep 2026'
  });
}

function esUploads(){
  if(typeof csAttachHost==='undefined'||!csAttachHost.attachments)return [];
  return csAttachHost.attachments.map(esStampUpload);
}
/* The one shape the rest of the file works on. `rec` is the live record, so
   writing to doc.esign writes through to the stored document. */
function esDoc(uid){
  if(typeof CS_AGREEMENTS!=='undefined'){
    const a=CS_AGREEMENTS.find(function(x){return x.uid===uid;});
    if(a)return {uid:uid,kind:'agreement',rec:a,key:a.key,
      name:csagFileName(a)+'.pdf',title:a.title,
      size:(a.key==='MSA'?'184 KB':'142 KB'),esign:esEnsure(a)};
  }
  const f=esUploads().find(function(x){return x.uid===uid;});
  if(f)return {uid:uid,kind:'upload',rec:f,key:null,
    name:f.name,title:f.name,size:f.size||'—',esign:f.esign};
  return null;
}

/* ── Signatories for a document ───────────────────────────────────────────
   Read from wherever the document already knows them. A generated agreement
   captured both parties in its form; an uploaded file knows nothing, so its
   signatories are whatever was entered in the send popup and kept on the
   record. Client first, company counter-signs - the order DocuSeal will use. */
function esSigners(doc){
  const e=doc.esign;
  if(e.signers&&e.signers.length)return e.signers;
  if(doc.kind==='agreement'){
    const v=doc.rec.values||{};
    return [
      {order:1,party:'Client',name:v.clientSig||'',title:v.clientSigTitle||'',
       email:(doc.rec.esSetup&&doc.rec.esSetup.clientEmail)||'',status:'pending',signedAt:null},
      {order:2,party:'Company',name:v.sig||'',title:v.sigTitle||'',
       email:ES_SIGNATORY_EMAIL[v.sig]||'',status:'pending',signedAt:null}
    ];
  }
  const s=doc.rec.esSetup||{};
  return [
    {order:1,party:'Client',name:s.clientName||'',title:s.clientTitle||'',
     email:s.clientEmail||'',status:'pending',signedAt:null},
    {order:2,party:'Company',name:s.companyName||'',title:s.companyTitle||'',
     email:ES_SIGNATORY_EMAIL[s.companyName]||s.companyEmail||'',status:'pending',signedAt:null}
  ];
}
/* US7/US8: "disabled if client signatory is missing". A signatory is missing
   when there is no name to address, or no email to send the link to - a name
   with no email cannot receive anything. */
function esClientSignerReady(doc){
  const c=esSigners(doc)[0];
  return !!(c&&String(c.name).trim()&&String(c.email).trim());
}
function esCompanySignerReady(doc){
  const c=esSigners(doc)[1];
  return !!(c&&String(c.name).trim()&&String(c.email).trim());
}

/* ── Can this document be sent, and if not, why ───────────────────────────
   THE BLOCKERS SPLIT IN TWO, AND THE SPLIT IS THE WHOLE POINT.

   A disabled button is only honest when the thing blocking it can be fixed
   somewhere else. Disabling it over something that is ONLY fixable in the
   popup that button opens is a dead end: the last version did exactly that to
   every uploaded file, because an upload has no signatory until someone types
   one into the send popup, and the disabled button was the only way in.

     esConfigBlock   the integration is off, incomplete, or failing its
                     connection test. Nothing in the popup can fix any of it -
                     the fix is on the E-Sign tab - so the row button really
                     is disabled, and says where to go.
     esSignerBlock   a signatory is missing. The popup collects exactly this,
                     for uploads and generated agreements alike, so the button
                     OPENS and the popup says what it still needs. Its own
                     Send stays disabled until the fields are filled, so
                     nothing can go out without a signatory either way.

   This reads the requirement's "button is disabled if signatory is missing"
   one level in - the send is blocked, and it is blocked where the missing
   value can actually be supplied. Taken literally at the row it made the
   feature unreachable for the uploaded MSA that US8 is entirely about. */
function esConfigBlock(){
  if(!esCfgComplete())return 'DocuSeal is not fully configured — see the E-Sign tab';
  if(!ESIGN_CFG.enabled)return 'DocuSeal integration is disabled — see the E-Sign tab';
  if(ESIGN_CFG.connection==='fail')return 'DocuSeal connection test is failing — see the E-Sign tab';
  return null;
}
function esSignerBlock(doc){
  if(!esClientSignerReady(doc))return 'Client signatory is missing';
  if(!esCompanySignerReady(doc))return 'Company signatory is missing';
  return null;
}
/* Everything that has to be true before a submission is created. Used by the
   popup's own Send button and by esSend(); the ROW uses esConfigBlock only. */
function esSendBlock(doc){
  if(doc.kind==='upload'&&doc.rec.signingRequired!=='Yes')return 'Signing not required for this file';
  return esConfigBlock()||esSignerBlock(doc);
}

/* ══ THE PROVIDER SEAM ════════════════════════════════════════════════════
   The two functions below are the only ones that pretend to be DocuSeal.
   In a real build the first becomes one POST to the platform's own backend,
   and the second stops existing entirely - the server receives the callback
   and pushes the change to the client. Nothing else in this file changes. */

/* Mints the ids DocuSeal would return, in DocuSeal's own shapes, so the
   fields the platform has to store are the fields it will really store. */
function esMintIds(){
  const h=function(n){let s='';const c='0123456789abcdef';for(let i=0;i<n;i++)s+=c[Math.floor(Math.random()*16)];return s;};
  return {submissionId:'sub_'+h(12),documentId:'doc_'+h(12),templateId:'tpl_'+h(10),slug:h(16)};
}
/* Resolves with the created submission, or rejects with the error a provider
   would actually hand back - a status code and a message, because "something
   went wrong" is not something an account manager can act on. */
function esApiCreateSubmission(doc,signers){
  return new Promise(function(resolve,reject){
    setTimeout(function(){
      if(!esCfgReady())
        return reject({code:409,msg:'DocuSeal integration is disabled or incomplete. Configure it under Platform Settings → Integrations → E-Sign.'});
      const ids=esMintIds();
      resolve({submissionId:ids.submissionId,documentId:ids.documentId,templateId:ids.templateId,
        slug:ids.slug,signingUrl:'https://sign.docuseal.com/s/'+ids.slug,
        submitters:signers.map(function(s,i){return {id:'sbm_'+ids.slug.slice(0,6)+i,email:s.email};})});
    },1400);
  });
}

/* ── Modal host ───────────────────────────────────────────────────────────
   Mounted straight under <body> rather than through renderADTPage(), exactly
   as the agreement popup is, so opening it does not repaint the entity panel
   underneath and lose its tab, its scroll and its state. */
let esState=null;   // {uid, view:'send'|'detail', busy, showSecret}
function esHost(){
  let h=document.getElementById('es-host');
  if(!h){h=document.createElement('div');h.id='es-host';document.body.appendChild(h);}
  return h;
}
function esPaint(){
  const h=esHost();
  h.innerHTML=esState?esModalHTML():'';
}
function esClose(){esState=null;esPaint();}
document.addEventListener('keydown',function(e){
  /* A request is in flight: closing would leave the user with no idea whether
     the submission was created. The close button is hidden for the same
     reason, so Escape must not be a way around it. */
  if(e.key==='Escape'&&esState&&!esState.busy)esClose();
});
/* The entity panel shows the row this popup just changed, so it is repainted
   when - and only when - it is the thing on screen. Same guard csagSubmit()
   uses, for the same reason. */
function esRefreshPanel(){
  if(typeof refreshCsSidebar==='function'&&typeof csSelectedItem!=='undefined'
     &&csSelectedItem!=null&&typeof csTab!=='undefined'&&csTab==='attachments')refreshCsSidebar();
}
function esOpenSend(uid){esState={uid:uid,view:'send',busy:false};esPaint();}
function esOpenDetail(uid){esState={uid:uid,view:'detail',busy:false};esPaint();}

/* ── Logging ──────────────────────────────────────────────────────────────
   One list per document, newest first, in the same shape the app's other logs
   use so it renders through the same .lp-log-* timeline. `kind` colours the
   dot; `code` is the DocuSeal event name, printed verbatim because that is
   what anyone debugging a delivery will be searching for. */
function esLog(doc,kind,title,detail,code){
  const s=stampNow();
  doc.esign.events.unshift({date:s.date,time:s.time,user:CURRENT_USER,
    kind:kind,title:title,detail:detail,code:code||null});
}

/* ══ US7 + US8 — SEND TO E-SIGN ═══════════════════════════════════════════
   THE POPUP IS THE GENERATE NDA POPUP. Same shell, same one-line subtitle,
   same flat two-column .ep-form-grid, same two-button footer. The first
   version of this screen wrapped its fields in three headed sub-sections and
   stacked two tinted notices above them, which made a six-field form read as
   a denser thing than the nineteen-field form it is opened from. Fields in
   one grid, one note, one primary action. */
function esField(id,label,val,ph,req){
  return '<div class="ep-form-group"><label class="ep-form-label" for="'+id+'">'+label
    +(req?' <span class="req">*</span>':'')+'</label>'
    +'<input class="ep-form-input" id="'+id+'" type="text" autocomplete="off" '
    +'placeholder="'+attrSafe(ph||'')+'" value="'+attrSafe(val||'')+'" oninput="esSyncSend()"></div>';
}
/* THE POPUP'S SEND RE-EVALUATES AS YOU TYPE. It starts disabled when a
   signatory is missing, which is the point of opening it - so it has to come
   back to life the moment the missing value is supplied. Repainting on every
   keystroke would take the caret out of the field being typed in, so only the
   button and the notice above it are touched. */
function esSyncSend(){
  const doc=esState&&esDoc(esState.uid);if(!doc)return;
  const g=function(id){const el=document.getElementById(id);return el?el.value.trim():'';};
  const ready=g('es-f-cl-name')&&g('es-f-cl-email')&&g('es-f-co-name')&&g('es-f-co-email');
  const signing=doc.kind!=='upload'||getCSValue('es-f-signreq')==='Yes';
  const hard=esConfigBlock();
  const btn=document.getElementById('es-send-go');
  if(btn){
    const blocked=!!hard||!ready||!signing;
    btn.disabled=blocked;
    btn.title=hard||(!signing?'Signing is not required for this file':(!ready?'Fill in both signatories first':''));
  }
  const note=document.getElementById('es-send-note');
  if(note)note.style.display=(ready&&signing)?'none':'';
}
/* The signing-required select is an apCS, which reports through a named hook. */
function esSendSyncHook(){esSyncSend();}
function esSendBodyHTML(doc){
  const e=doc.esign,sg=esSigners(doc),cl=sg[0],co=sg[1];
  const isUp=doc.kind==='upload';
  const block=esSendBlock(doc);
  let out='';

  /* A previous attempt that failed stays on the record, so its reason is shown
     where the next attempt is made - not only in a toast that has gone. */
  if(e.status==='failed'&&e.error)
    out+='<div class="info-box" style="margin:0 0 18px"><div class="ib-icon">'+ES_ICO.warn+'</div>'
      +'<div><strong>The last attempt failed</strong>'+sbEsc(e.error)+'</div></div>';
  else
    out+='<div class="info-box" id="es-send-note" style="margin:0 0 18px'+(block?'':';display:none')+'">'
      +'<div class="ib-icon">'+ES_ICO.warn+'</div>'
      +'<div><strong>Not ready to send</strong>'+sbEsc(block||'Fill in both signatories.')+'</div></div>';

  /* One grid. Signing required leads for an uploaded file because it decides
     whether the rest of the form applies at all. */
  out+='<div class="ep-form-grid">'
    +(isUp
      ?'<div class="ep-form-group"><label class="ep-form-label">Signing required <span class="req">*</span></label>'
        +apCS('es-f-signreq',['Yes','No'],doc.rec.signingRequired||'No','Select','esSendSyncHook')+'</div>'
        +'<div class="ep-form-group"></div>'
      :'')
    +esField('es-f-cl-name','Client Signatory Name',cl.name,'Full name',true)
    +esField('es-f-cl-title','Client Signatory Title',cl.title,'e.g. Managing Director',false)
    +esField('es-f-cl-email','Client Signatory Email',cl.email,'name@client.com',true)
    +esField('es-f-co-name','Company Signatory Name',co.name,'Full name',true)
    +esField('es-f-co-title','Company Signatory Title',co.title,'e.g. Director',false)
    +esField('es-f-co-email','Company Signatory Email',co.email,'name@opendhi.com',true)
    +'</div>';

  /* The one note. It carries the two facts a sender needs and cannot see:
     that the file goes over untouched, and that the link is DocuSeal's to
     send, not ours. */
  out+=esNote('<strong>'+sbEsc(doc.name)+' &middot; '+sbEsc(doc.size)+'</strong>'
    +'Sent to '+sbEsc(ESIGN_CFG.provider)+' '+sbEsc(ESIGN_CFG.env)+' exactly as it stands — no fields are merged '
    +'into it and no wording is rewritten. '+sbEsc(ESIGN_CFG.provider)+' emails the signing link to the client '
    +'and counter-signer above, captures the signatures and returns the signed PDF and audit certificate.');
  return out;
}
function esSendingHTML(doc){
  return '<div class="es-sending"><div class="es-spinner"></div>'
    +'<div class="es-sending-title">Creating '+sbEsc(ESIGN_CFG.provider)+' submission…</div>'
    +'<p class="es-sending-sub">Uploading '+sbEsc(doc.name)+' and registering both signatories. '
    +'The signing link is emailed once the submission is created.</p></div>';
}
/* Reads the popup back. The values are kept on the record even when the send
   is refused - retyping an email after a failed attempt is a waste of the
   sender's time. */
function esReadSend(doc){
  const g=function(id){const el=document.getElementById(id);return el?el.value.trim():'';};
  const setup={
    clientName:g('es-f-cl-name'),clientTitle:g('es-f-cl-title'),clientEmail:g('es-f-cl-email'),
    companyName:g('es-f-co-name'),companyTitle:g('es-f-co-title'),companyEmail:g('es-f-co-email')
  };
  doc.rec.esSetup=setup;
  if(doc.kind==='upload'){
    const sr=getCSValue('es-f-signreq');
    if(sr)doc.rec.signingRequired=sr;
  }
  /* Also kept on the e-sign record: from here on this list is what DocuSeal
     was told, and it must not drift when the form behind it does. */
  return [
    {order:1,party:'Client',name:setup.clientName,title:setup.clientTitle,email:setup.clientEmail,status:'pending',signedAt:null},
    {order:2,party:'Company',name:setup.companyName,title:setup.companyTitle,email:setup.companyEmail,status:'pending',signedAt:null}
  ];
}
/* US8's save-without-sending: a colleague can set the signatory now and send
   later, and marking a file as not requiring signature is itself a decision
   worth keeping. */
function esSaveSetup(){
  const doc=esDoc(esState.uid);if(!doc)return;
  esReadSend(doc);
  esRefreshPanel();
  showToast('Signing setup saved','success',
    doc.rec.signingRequired==='Yes'
      ?sbEsc(doc.name)+' is marked as requiring signature.'
      :sbEsc(doc.name)+' is marked as not requiring signature.');
  esClose();
}
function esSend(){
  const doc=esDoc(esState.uid);if(!doc)return;
  const signers=esReadSend(doc);
  const e=doc.esign;

  /* Validated here as well as on the button: the popup's fields can be
     cleared after it opened. */
  const missing=[];
  if(!signers[0].name)missing.push('Client Signatory Name');
  if(!signers[0].email)missing.push('Client Signatory Email');
  if(!signers[1].name)missing.push('Company Signatory Name');
  if(!signers[1].email)missing.push('Company Signatory Email');
  if(doc.kind==='upload'&&doc.rec.signingRequired!=='Yes')missing.push('Signing required = Yes');
  if(missing.length){
    showToast('Cannot send for e-sign','error',
      missing.length===1?missing[0]+' is required.':missing.length+' details missing — first: '+missing[0]+'.');
    esPaint();return;
  }

  e.status='sending';e.error=null;e.signers=signers;
  esLog(doc,'wait','Sending for e-sign',
    'Creating a '+ESIGN_CFG.provider+' submission for '+signers[0].email+' and '+signers[1].email+'.','api.request');
  esState.busy=true;esPaint();esRefreshPanel();

  esApiCreateSubmission(doc,signers).then(function(res){
    const s=stampNow();
    e.status='sent';
    e.submissionId=res.submissionId;e.documentId=res.documentId;
    e.templateId=res.templateId;e.slug=res.slug;e.signingUrl=res.signingUrl;
    e.sentOn=s.date+' | '+s.time;e.sentBy=CURRENT_USER;
    e.signers.forEach(function(sg,i){sg.submitterId=res.submitters[i].id;sg.status='pending';});
    esLog(doc,'ok','Sent for E-sign',
      'Submission '+res.submissionId+' created. DocuSeal emailed the signing link to '+signers[0].email+'.','api.response');
    /* An entity-level event, so it also lands in this entity's Logs and
       Workflow. The per-delivery callbacks below do not - see the note at the
       top of esign-settings.js on what earns a place there. */
    esEntityLog(doc.name+' sent for e-sign to '+signers[0].email+' ('+ESIGN_CFG.provider
      +' reference '+res.submissionId+').','Document Sent for E-Sign',
      doc.title+' was sent to '+ESIGN_CFG.provider+' for signature by '+signers[0].name+' and '+signers[1].name+'.');
    esState.busy=false;esState.view='detail';esPaint();esRefreshPanel();
    showToast((doc.kind==='agreement'?doc.key:'Document')+' sent for e-sign successfully','success',
      'Reference '+res.submissionId+' · link emailed to '+signers[0].email+'.');
  }).catch(function(err){
    /* US7/US8: status becomes Failed and the reason is visible - kept on the
       record, not only in a toast. */
    e.status='failed';e.error=err.msg||String(err);
    esLog(doc,'bad','Failed',e.error,'api.error');
    esEntityLog('E-sign send failed for '+doc.name+'. '+e.error,'Document E-Sign Failed',
      doc.title+' could not be sent to '+ESIGN_CFG.provider+'. '+e.error);
    esState.busy=false;esState.view='detail';esPaint();esRefreshPanel();
    showToast('Could not send for e-sign','error',e.error);
  });
}

/* ══ US9 — WEBHOOK EVENTS ═════════════════════════════════════════════════
   In a real build this is a server endpoint. What it has to do is the same
   either way, and all of it is modelled: verify the secret, refuse a repeat of
   an event already processed, move the status, and log the delivery whatever
   the outcome.

   `key` is the idempotency key. DocuSeal sends one per event; re-delivering
   the same event - which it does on any timeout - must not write the record
   twice. Deriving the key from the submission and the event name means
   choosing the same event twice from the simulator behaves exactly as a
   duplicate delivery would. */
const ES_EVENTS=[
  {id:'form.viewed',           label:'form.viewed — client opened the document', to:'viewed'},
  {id:'form.completed.client', label:'form.completed — client signed',           to:'signed-client'},
  {id:'form.completed.company',label:'form.completed — company counter-signed',  to:'signed-company'},
  {id:'submission.completed',  label:'submission.completed — all signers done',  to:'executed'},
  {id:'submission.declined',   label:'submission.declined — a signer declined',  to:'declined'},
  {id:'submission.expired',    label:'submission.expired — the link expired',    to:'expired'},
  {id:'submission.failed',     label:'submission.failed — provider-side error',  to:'failed'}
];
function esEventByIdLabel(label){return ES_EVENTS.find(function(e){return e.label===label;});}

function esDeliverWebhook(uid,eventId){
  const doc=esDoc(uid);if(!doc)return;
  const e=doc.esign;
  const ev=ES_EVENTS.find(function(x){return x.id===eventId;});
  if(!ev)return;

  /* Nothing to attach the event to. A callback for a submission the platform
     never created is a misrouted delivery, and it is logged as one. */
  if(!e.submissionId){
    showToast('Webhook rejected','error','404 — no DocuSeal submission on this document.');
    return;
  }
  /* US9: "webhook secret is validated". Missing secret means the endpoint
     cannot verify the signature, so it must refuse the payload rather than
     trust it. */
  if(!String(ESIGN_CFG.webhookSecret||'').trim()){
    esLog(doc,'bad','Webhook rejected',
      'Signature could not be verified: no webhook secret is configured. Payload discarded.',ev.id);
    esPaint();esRefreshPanel();
    showToast('Webhook rejected','error','401 — webhook secret is not configured.');
    return;
  }
  /* US9: "duplicate webhook events do not create duplicate records". */
  const key='evt_'+e.submissionId.slice(-8)+'_'+ev.id;
  if(e.seen.indexOf(key)>=0){
    esLog(doc,'event','Duplicate event ignored',
      'Idempotency key '+key+' was already processed. Status left at '+esStatusLabel(doc)+'; no record written.',ev.id);
    esPaint();esRefreshPanel();
    showToast('Duplicate webhook ignored','info',key+' was already processed.');
    return;
  }
  e.seen.push(key);

  const s=stampNow();
  const sg=e.signers;
  let title=ES_STATUS[ev.to].label,detail='',kind='info';

  if(ev.to==='viewed'){
    detail='Signature request opened by '+(sg[0]?sg[0].email:'the client')+'.';kind='info';
  }else if(ev.to==='signed-client'){
    if(sg[0]){sg[0].status='signed';sg[0].signedAt=s.date+' | '+s.time;}
    detail=(sg[0]?sg[0].name:'The client')+' signed. Waiting on the company counter-signature.';kind='info';
  }else if(ev.to==='signed-company'){
    if(sg[1]){sg[1].status='signed';sg[1].signedAt=s.date+' | '+s.time;}
    detail=(sg[1]?sg[1].name:'The company signatory')+' counter-signed.';kind='info';
  }else if(ev.to==='executed'){
    if(sg[0]&&sg[0].status!=='signed'){sg[0].status='signed';sg[0].signedAt=s.date+' | '+s.time;}
    if(sg[1]&&sg[1].status!=='signed'){sg[1].status='signed';sg[1].signedAt=s.date+' | '+s.time;}
    e.signedAt=s.date+' | '+s.time;
    kind='ok';
  }else if(ev.to==='declined'){
    detail=(sg[0]?sg[0].name:'A signer')+' declined to sign. The submission is closed and cannot be signed further.';kind='bad';
  }else if(ev.to==='expired'){
    detail='The signing link expired before all signers completed. A new submission is required.';kind='bad';
  }else if(ev.to==='failed'){
    e.error='DocuSeal reported a provider-side failure on submission '+e.submissionId+'.';
    detail=e.error;kind='bad';
  }

  e.status=ev.to;
  esLog(doc,kind,title,'Signature verified · '+(detail||'Status updated from the DocuSeal callback.'),ev.id);
  /* Only the ends of the story reach the entity's history. Viewed and the
     individual signatures stay on the document, where forty of them would not
     bury the four entries that matter here. */
  if(['executed','declined','expired','failed'].indexOf(ev.to)>=0)
    esEntityLog(doc.name+' — '+ES_STATUS[ev.to].label+'. '+(detail||''),
      'Document '+ES_STATUS[ev.to].label,
      doc.title+' reported '+ES_STATUS[ev.to].label+' by '+ESIGN_CFG.provider+'. '+(detail||''));

  /* US10 hangs off exactly one event: the submission completing is the only
     point at which a signed PDF and an audit certificate exist to fetch. */
  if(ev.to==='executed')esFetchFiles(doc);

  esPaint();esRefreshPanel();
  showToast('Webhook processed','success',ev.id+' → '+esStatusLabel(doc));
}
/* Walks the happy path in one go. A reviewer wants to see the end state
   without pressing seven buttons, and each step still goes through the same
   delivery function, so nothing is short-circuited. */
function esRunFlow(uid){
  const seq=['form.viewed','form.completed.client','form.completed.company','submission.completed'];
  seq.forEach(function(id,i){setTimeout(function(){esDeliverWebhook(uid,id);},i*900);});
}
function esRedeliverLast(uid){
  const doc=esDoc(uid);if(!doc)return;
  const last=doc.esign.events.find(function(ev){return ev.code&&ev.code.indexOf('.')>0&&ev.code.indexOf('api.')<0;});
  if(!last)return showToast('Nothing to re-deliver','info','No DocuSeal event has been delivered yet.');
  esDeliverWebhook(uid,last.code);
}

/* ══ US10 — SIGNED DOCUMENT AND AUDIT TRAIL ═══════════════════════════════
   Fetching the finished artefacts is a second step that can fail on its own:
   the submission really is executed, and the platform really does not have
   the file yet. Collapsing the two would either hide a completed signature or
   claim a file it cannot produce, so they are separate states. */
function esFetchFiles(doc){
  const e=doc.esign;
  e.syncAttempts++;
  const base=doc.kind==='agreement'?csagFileName(doc.rec):String(doc.name).replace(/\.[^.]+$/,'');
  e.status='executed';
  e.signedPdf={name:base+'_signed.pdf',size:'196 KB',at:e.signedAt};
  e.auditCert={name:base+'_audit_trail.pdf',size:'34 KB',at:e.signedAt};
  esEntityLog('Signed '+doc.name+' and its audit certificate stored against the document record.',
    'Signed Document Stored',
    'The signed PDF and the audit certificate for '+doc.title+' were fetched from '+ESIGN_CFG.provider+' and stored.');
  esLog(doc,'ok','Signed document stored',
    'Signed PDF and audit certificate fetched from DocuSeal and stored against this document'
    +(e.syncAttempts>1?' (attempt '+e.syncAttempts+').':'.'),'file.sync.ok');
}
function esRetrySync(uid){
  const doc=esDoc(uid);if(!doc)return;
  esLog(doc,'event','File sync retried','Manual retry requested by '+CURRENT_USER+'.','file.sync.retry');
  esFetchFiles(doc);
  esPaint();esRefreshPanel();
  showToast(doc.esign.signedPdf?'Files synced':'Sync failed again','info',
    doc.esign.signedPdf?'Signed PDF and audit trail are now stored.':'DocuSeal still did not return the signed PDF.');
}
function esDownload(uid,which){
  const doc=esDoc(uid);if(!doc)return;
  if(!esCanDownload())return showToast('Not permitted','error','Your role cannot download signed documents.');
  const f=which==='audit'?doc.esign.auditCert:doc.esign.signedPdf;
  if(!f)return;
  showToast('Preparing download','success',sbEsc(f.name)+' ('+f.size+') will download shortly.');
}

/* ── Small parts ──────────────────────────────────────────────────────────
   A read-only fact is drawn as .lp-sb-field-card - icon, small grey label,
   bold value - which is how the entity's Basic Details tab draws every fact
   it shows. An e-sign reference is the same kind of thing, so it gets the
   same card rather than a second one that means the same and looks different. */
function esFact(icon,label,val,opts){
  opts=opts||{};
  const has=val!=null&&val!=='';
  const body=has
    ?'<span'+(opts.mono?' class="es-mono"':'')+' title="'+attrSafe(val)+'">'+sbEsc(val)+'</span>'
      +(opts.copy?'<button type="button" class="es-copy" title="Copy" onclick="esCopy('+attrSafe(JSON.stringify(String(val)))+')">'+ES_ICO.copy+'</button>':'')
    :'<span class="es-none">Not yet issued</span>';
  return '<div class="lp-sb-field-card'+(opts.wide?' is-wide':'')+'">'
    +'<div class="lp-sb-field-icon">'+icon+'</div>'
    +'<div class="lp-sb-field-content"><div class="lp-sb-field-label">'+sbEsc(label)+'</div>'
    +'<div class="lp-sb-field-value">'+body+'</div></div></div>';
}
/* A section inside the popup: the panel section heading the app already uses,
   with an optional status or count sitting on its right. */
function esSection(title,right,body,cls){
  return '<div class="es-sec'+(cls?' '+cls:'')+'">'
    +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">'+title+'</span>'
    +(right||'')+'</div>'+body+'</div>';
}
function esNote(body){
  return '<div class="info-box tip"><div class="ib-icon">'+ES_ICO.info+'</div><div>'+body+'</div></div>';
}
function esCopy(val){
  const done=function(){showToast('Copied','success',sbEsc(val));};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(val).then(done,done);
  else done();
}

/* ── The detail view (US7 status, US9 log, US10 files) ────────────────────
   Built from the entity detail panel's parts: a section heading with its
   status on the right, then facts as .lp-sb-field-card, then the listing's
   own table, then the app's log timeline. Nothing here is a shape the app
   does not already draw somewhere else. */
function esDetailHTML(doc){
  const e=doc.esign,sg=e.signers.length?e.signers:esSigners(doc);
  const out=[];

  /* Reference. Six facts in the detail grid, every one of them something the
     platform stores and somebody will one day have to quote to support. */
  out.push(esSection('Reference',esBadge(doc),
    '<div class="lp-sb-detail-grid es-facts">'
    +esFact(ES_ICO.fHash,'DocuSeal Submission ID',e.submissionId,{mono:true,copy:true})
    +esFact(ES_ICO.fDoc,'DocuSeal Document ID',e.documentId,{mono:true,copy:true})
    +esFact(ES_ICO.fId,'DocuSeal Template ID',e.templateId,{mono:true,copy:true})
    +esFact(ES_ICO.fFlag,'Environment',ESIGN_CFG.provider+' '+ESIGN_CFG.env)
    +esFact(ES_ICO.fCal,'Sent On',e.sentOn)
    +esFact(ES_ICO.fUser,'Sent By',e.sentBy)
    +'</div>'));

  if(e.status==='failed'&&e.error)
    out.push('<div class="info-box" style="margin:-6px 0 20px"><div class="ib-icon">'+ES_ICO.warn+'</div>'
      +'<div><strong>Failed</strong>'+sbEsc(e.error)+'</div></div>');
  else if(e.status==='declined'||e.status==='expired')
    out.push('<div class="info-box" style="margin:-6px 0 20px"><div class="ib-icon">'+ES_ICO.warn+'</div>'
      +'<div><strong>'+esStatusLabel(doc)+'</strong>This submission is closed. Send the document again to create a new one.</div></div>');
  else if(e.signingUrl&&esInFlight(doc))
    out.push('<div class="es-sec"><div class="lp-sb-detail-grid">'
      +esFact(ES_ICO.fLink,'Signing link (held by '+ESIGN_CFG.provider+', emailed to the client)',e.signingUrl,{mono:true,copy:true,wide:true})
      +'</div></div>');

  /* Signatories. The listing's table, so it reads as the same species of
     table as the Attachments tab this popup was opened from. */
  const done=sg.filter(function(s){return s.status==='signed';}).length;
  out.push(esSection('Signatories','<span class="es-sub" style="margin:0">'+done+' of '+sg.length+' signed</span>',
    '<table class="csag-table"><thead><tr>'
      +'<th>#</th><th>Party</th><th>Signatory</th><th>Email</th><th>Status</th><th>Signed On</th>'
    +'</tr></thead><tbody>'
    +sg.map(function(s){
        return '<tr><td class="csag-td csag-num">'+s.order+'</td>'
          +'<td class="csag-td"><span class="es-party is-'+s.party.toLowerCase()+'">'+s.party+'</span></td>'
          +'<td class="csag-td">'+(s.name?'<div class="lp-c-main">'+sbEsc(s.name)+'</div>':'<span class="es-missing">Not set</span>')
            +(s.title?'<div class="es-sub">'+sbEsc(s.title)+'</div>':'')+'</td>'
          +'<td class="csag-td">'+(s.email?sbEsc(s.email):'<span class="es-missing">Not set</span>')+'</td>'
          +'<td class="csag-td"><span class="lp-status-badge tone-'+(s.status==='signed'?'ok':'wait')+'">'
            +(s.status==='signed'?'Signed':'Pending')+'</span></td>'
          +'<td class="csag-td">'+(s.signedAt?sbEsc(s.signedAt):'—')+'</td></tr>';
      }).join('')
    +'</tbody></table>'));

  /* Signed files. Present, awaited or withheld - each states which in the
     same row, so the list never silently shortens. */
  const fileRow=function(ico,glyph,name,sub,acts){
    return '<div class="es-file"><div class="csag-file">'
      +'<span class="csag-file-ico '+ico+'">'+glyph+'</span>'
      +'<div class="csag-file-txt"><div class="lp-c-main">'+name+'</div><div class="lp-c-sub">'+sub+'</div></div>'
      +'</div><div class="es-file-acts">'+(acts||'')+'</div></div>';
  };
  let files='';
  if(e.signedPdf||e.auditCert){
    if(!esCanDownload()){
      files=fileRow('es-ico-lock',ES_ICO.lockSm,'2 signed files stored',
        'Your role ('+sbEsc(ES_ROLE)+') cannot download signed documents.','');
    }else{
      files=[['signed',e.signedPdf,'Signed document','es-ico-signed',ES_ICO.doc],
             ['audit',e.auditCert,'Audit trail &middot; certificate of completion','es-ico-audit',ES_ICO.shield]]
        .filter(function(r){return r[1];})
        .map(function(r){
          return fileRow(r[3],r[4],sbEsc(r[1].name),
            sbEsc(r[1].size)+' &middot; '+r[2]+' &middot; stored '+sbEsc(r[1].at||'—'),
            '<button class="att-row-btn" title="View" onclick="esDownload(\''+doc.uid+'\',\''+r[0]+'\')">'+ES_ICO.eye+'</button>'
            +'<button class="att-row-btn" title="Download" onclick="esDownload(\''+doc.uid+'\',\''+r[0]+'\')">'+ES_ICO.dl+'</button>');
        }).join('');
    }
  }else if(e.status==='sync-pending'){
    files=fileRow('es-ico-wait',ES_ICO.warnSm,'Signed PDF not yet retrieved',
      'All signers completed. '+e.syncAttempts+' fetch attempt'+(e.syncAttempts===1?'':'s')
      +' so far — the signature is valid, only the stored copy is missing.',
      '<button class="att-link" onclick="esRetrySync(\''+doc.uid+'\')">'+ES_ICO.refresh+' Retry sync</button>')
      /* Both of these are open in the written requirement, so they are marked
         where the decision will be made rather than in a document nobody has
         open beside the screen. */
      +'<div class="info-box" style="margin-top:10px"><div class="ib-icon">'+ES_ICO.warn+'</div>'
      +'<div><strong>Open in the written requirement<span class="es-tbd">to confirm</span></strong>'
      +'The wording &ldquo;Fully Executed — File Sync Pending&rdquo; is shown as drafted but still awaits confirmation, and '
      +'the retry rules — how many attempts, how far apart, who is alerted when they run out — are not specified. '
      +'Retry is manual until they are.</div></div>';
  }else{
    files='<div class="es-empty">The signed PDF and audit trail appear here once '+sbEsc(ESIGN_CFG.provider)
      +' reports the submission complete.</div>';
  }
  out.push(esSection('Signed Files',
    e.signedAt?'<span class="es-sub" style="margin:0">Signed '+sbEsc(e.signedAt)+'</span>':'',files));

  /* The delivery log, on the app's own timeline. */
  const evs=e.events;
  out.push(esSection('Webhook &amp; Activity Log',
    '<span class="es-sub" style="margin:0">'+evs.length+' entr'+(evs.length===1?'y':'ies')+' &middot; newest first</span>',
    (evs.length
      ?'<div class="lp-logs-timeline">'+evs.map(function(ev,i){
          return '<div class="lp-log-row">'
            +'<div class="lp-log-avatar-col"><div class="lp-log-avatar lp-log-avatar--'+ev.kind+'">'+ES_ICO.person+'</div>'
              +(i<evs.length-1?'<div class="lp-log-connector"></div>':'')+'</div>'
            +'<div class="lp-log-card">'
            +'<div class="lp-log-status-row"><span class="lp-log-dot lp-log-dot--'+ev.kind+'"></span>'
              +'<span class="lp-log-status-text lp-log-status-text--'+ev.kind+'">'+sbEsc(ev.title)+'</span>'
              +(ev.code?'<span class="es-code'+(ev.title==='Duplicate event ignored'?' es-code-dupe':'')+'">'+sbEsc(ev.code)+'</span>':'')+'</div>'
            +'<div class="lp-log-meta-row"><span class="lp-log-meta-item">'+ES_ICO.person+'<span>'+sbEsc(ev.user)+'</span></span>'
              +'<span class="lp-log-meta-item">'+ES_ICO.cal+'<span>'+sbEsc(ev.date)+'</span></span>'
              +'<span class="lp-log-meta-item">'+ES_ICO.clk+'<span>'+sbEsc(ev.time)+'</span></span></div>'
            +'<div class="lp-log-comment-row">'+sbEsc(ev.detail)+'</div>'
            +'</div></div>';
        }).join('')+'</div>'
      :'<div class="es-empty">No events yet.</div>'),'es-log'));

  /* Stands in for DocuSeal's side of the conversation. Fenced off by a dashed
     edge and by its wording, because in a real build this card does not exist
     and the server receives the callbacks instead. */
  if(e.submissionId){
    out.push('<div class="es-sim">'
      +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Webhook Simulator</span><span class="es-tag">mock only</span></div>'
      +'<p class="es-sim-sub">Stands in for '+sbEsc(ESIGN_CFG.provider)+' calling <span class="es-code">POST '
        +sbEsc(ESIGN_CFG.webhookUrl)+'</span>. Each delivery runs the handling the real endpoint needs: the secret is '
        +'verified, an event already processed is refused, the status moves, and the delivery is logged either way.</p>'
      +'<div class="es-sim-row">'+apCS('es-f-evt',ES_EVENTS.map(function(x){return x.label;}),'','Select an event to deliver')
        +'<button class="ep-save-btn" onclick="esSimDeliver(\''+doc.uid+'\')">Deliver</button></div>'
      +'<div class="es-sim-btns">'
        +'<button class="att-link" onclick="esRunFlow(\''+doc.uid+'\')">'+ES_ICO.bolt+' Run the full signing flow</button>'
        +'<button class="att-link" onclick="esRedeliverLast(\''+doc.uid+'\')">'+ES_ICO.refresh+' Re-deliver last event (tests de-duplication)</button>'
      +'</div></div>');
  }
  return out.join('');
}
function esSimDeliver(uid){
  const label=getCSValue('es-f-evt');
  if(!label)return showToast('Pick an event','error','Choose the DocuSeal event to deliver.');
  const ev=esEventByIdLabel(label);
  if(ev)esDeliverWebhook(uid,ev.id);
}

/* ── The popup shell ──────────────────────────────────────────────────────
   The Generate NDA popup's shell, unchanged: title, one-line subtitle, body,
   and a footer of at most two buttons on the right. */
function esModalHTML(){
  const doc=esDoc(esState.uid);
  if(!doc)return '';
  const e=doc.esign,send=esState.view==='send';
  const isUp=doc.kind==='upload';
  const block=esSendBlock(doc);

  let body,foot;
  if(esState.busy){
    body=esSendingHTML(doc);foot='';
  }else if(send){
    body=esSendBodyHTML(doc);
    foot='<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="'+(isUp?'esSaveSetup()':'esClose()')+'">'+(isUp?'Save &amp; Close':'Cancel')+'</button>'
      +'<button class="ep-save-btn" id="es-send-go" onclick="esSend()"'
        +(block?' disabled title="'+attrSafe(block)+'"':'')+'>Send to E-sign</button>'
      +'</div></div>';
  }else{
    body=esDetailHTML(doc);
    const canResend=!esInFlight(doc)&&!esIsDone(doc)&&esCanSend();
    foot='<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +(canResend?'<button class="ep-cancel-btn" onclick="esOpenSend(\''+doc.uid+'\')">Send again</button>':'')
      +'<button class="ep-save-btn" onclick="esClose()">Close</button>'
      +'</div></div>';
  }

  /* Title names the action or the document; the subtitle carries the file and
     the provider, which is the same division Generate NDA uses. */
  const title=send
    ?'Send '+(doc.kind==='agreement'?doc.key:'Document')+' to E-sign'
    :'E-Sign &mdash; '+sbEsc(doc.title);
  const sub=send
    ?sbEsc(doc.title)+' for '+sbEsc(csagEntity())+'. Fields marked <span class="req">*</span> are required.'
    :sbEsc(doc.name)+' &middot; '+sbEsc(doc.size)+' &middot; '+sbEsc(ESIGN_CFG.provider)+' '+sbEsc(ESIGN_CFG.env);

  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form es-modal" role="dialog" aria-modal="true" '
      +'aria-label="'+attrSafe(title.replace(/&mdash;/g,'-'))+'" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+title+'</span>'
      +(esState.busy?'':'<button class="ct-modal-close" onclick="esClose()" aria-label="Close">'+ES_ICO.x+'</button>')+'</div>'
    +'<div class="csag-subrow"><p class="ct-modal-sub">'+sub+'</p></div>'
    +'<div class="csag-body">'+body+'</div>'
    +foot
    +'</div></div>';
}

/* ══ THE ROW CELLS ════════════════════════════════════════════════════════
   Called from the Attachments listing in cs-agreements.js. They return the
   contents of the EXISTING Action cell, which keeps its columns, its widths,
   its right alignment and its single line.

   ONE STATEMENT PER ROW, which is what keeps that line short enough to fit.
   A generated agreement that has not been sent shows a Send button; the
   button already says the document exists and is waiting to go, so repeating
   it as a "Draft Generated" pill beside it spends about a hundred pixels on
   nothing. Once it HAS been sent the button is gone - a second submission for
   one document is not an action anybody should be offered - and the pill
   takes the space back to report where the signature has got to.

   So: the action while there is one, the status once there is one. Never
   both, and never a second line. */
function esSendControl(doc){
  if(!esCanSend())return '';
  /* US8: signing required = No hides the button outright. */
  if(doc.kind==='upload'&&doc.rec.signingRequired!=='Yes')return '';
  const hard=esConfigBlock();
  const soft=esSignerBlock(doc);
  const title=hard
    ? 'Cannot send — '+hard
    : (soft?soft+' — open to add it and send':'Send to '+ESIGN_CFG.provider+' for signature');
  return '<button class="es-send-btn" onclick="esOpenSend(\''+doc.uid+'\')"'
    +(hard?' disabled':'')+' title="'+attrSafe(title)+'">'
    +ES_ICO.pen+'<span class="es-send-lbl">Send to E-sign</span></button>';
}
function esDetailBtn(doc){
  return '<button class="att-row-btn es-detail" title="E-sign details" onclick="esOpenDetail(\''+doc.uid+'\')">'+ES_ICO.pen+'</button>';
}

/* The agreement rows. The chip is returned separately from the actions
   because the listing draws View and Download between them. */
function esAgStatusChip(a){
  const doc=esDoc(a.uid);
  /* Without esign state this is the generated document's own step, which US7
     names Draft Generated and makes the precondition for sending. */
  if(!doc||!esCanSeeEsign())return '<span class="lp-status-badge tone-wait csag-row-status">Draft Generated</span>';
  if(doc.esign.status==='none'&&esSendControl(doc))return '';   // the button speaks for it
  return esBadge(doc,'csag-row-status');
}
function esAgActionCell(a){
  if(a.status==='pending')return '';        // nothing generated yet: Generate stands alone
  const doc=esDoc(a.uid);
  if(!doc||!esCanSeeEsign())return '';
  return doc.esign.status==='none'?esSendControl(doc):esDetailBtn(doc);
}

/* The uploaded rows. No chip until there is e-sign state worth reporting -
   a grey "Not Sent" pill on every attachment would be noise on the files
   that are never going to be signed. */
function esUpStatusChip(f){
  esStampUpload(f);
  const doc=esDoc(f.uid);
  if(!doc||!esCanSeeEsign()||doc.esign.status==='none')return '';
  return esBadge(doc,'csag-row-status');
}
/* THE COG IS THE WAY BACK, AND ONLY THAT. It opens the same popup the Send
   button opens, so showing both put two doors to one room in a cell with no
   width to spare - on the uploaded row it pushed Source out of view.

   It earns its place in exactly one state: signing required = No, where the
   Send button is hidden and the cog is the only route to the setting that hid
   it. Everywhere else the Send button already leads there, and once the
   document has gone out the setting is moot. */
function esUpActionCell(f){
  esStampUpload(f);
  const doc=esDoc(f.uid);
  if(!doc||!esCanSeeEsign())return '';
  const primary=doc.esign.status==='none'?esSendControl(doc):esDetailBtn(doc);
  if(primary)return primary;
  /* The one state that needs the cog: signing required = No, where US8 hides
     the Send button and this is the only route back to the setting that hid
     it. */
  return esCanSend()
    ?'<button class="att-row-btn es-cog" title="Signing not required for this file — open e-sign setup" '
      +'onclick="esOpenSend(\''+doc.uid+'\')">'+ES_ICO.cog+'</button>'
    :'';
}
