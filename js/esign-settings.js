/* ══ COMPANY SETTINGS → E-SIGN TAB (US11) ═════════════════════════════════
   WHERE THIS LIVES, AND WHY IT MOVED. This was briefly a module of its own -
   a Platform Settings page in the sidebar. That was wrong. The thing being
   configured is how THIS entity's documents get signed, and every other
   answer about the entity - its banking, its payroll, its leave rules, its
   attachments - is a tab on the entity's own panel. A reader looking for
   "how do we sign this client's NDA" opens the client, not a second module
   in the rail. So E-Sign is a tab beside Attachments, which is where the
   documents it signs already are.

   IT RECORDS ITSELF WHERE THE ENTITY ALREADY KEEPS ITS HISTORY. There is no
   private audit table here. A credential change, a connection test, a
   document sent, a document fully executed - each goes into csLogsData and
   csWorkflowData, the same two lists the Logs and Workflow tabs of this
   panel already read. One entity, one history.

   WHAT GOES IN, AND WHAT DOES NOT. Logs and Workflow carry the entity's
   story, so they get the events that change it: configuration saved, tested,
   enabled or disabled; a document sent for signature; a document fully
   executed, declined, expired or failed. The per-delivery webhook traffic -
   viewed, first signature, duplicate ignored - stays on the document's own
   E-Sign popup, because forty callbacks would bury the four entity events
   that actually matter. */

/* ── Writing into the entity's own history ────────────────────────────────
   `status` is the entity's status at the time, which is what a log row in
   this app carries - see the comment on logIsChange() in core.js. The entity
   is Active throughout, so these read as "Updated", which is correct: none of
   them moves the entity's status. */
function esEntityLog(action,workflowTitle,description){
  const s=stampNow();
  if(typeof csLogsData!=='undefined')
    csLogsData.unshift({date:s.date,time:s.time,user:CURRENT_USER,status:'Active',action:action});
  if(workflowTitle&&typeof csWorkflowData!=='undefined')
    csWorkflowData.unshift({title:workflowTitle,user:CURRENT_USER,date:s.date,time:s.time,
      description:description||action});
}

/* ── Draft state ──────────────────────────────────────────────────────────
   US11 wants a Save that is disabled until the required fields are complete,
   and a Test Connection that validates what has been typed. Both only mean
   something if typing has not already taken effect - so the form edits a
   copy, Test reads the copy, and Save is the moment the copy becomes the live
   configuration. Everything downstream - the Send to E-sign buttons over in
   Attachments - therefore changes at Save, which is what an admin expects. */
let esCfgDraft=null;
let esShowKey=false,esShowSecret=false;
let esTestState=null;   // null | 'busy' | {ok:bool, msg:string}

function esCfgDraftInit(force){
  if(force||!esCfgDraft)esCfgDraft={
    provider:ESIGN_CFG.provider,env:ESIGN_CFG.env,baseUrl:ESIGN_CFG.baseUrl,
    apiKey:ESIGN_CFG.apiKey,webhookSecret:ESIGN_CFG.webhookSecret,enabled:ESIGN_CFG.enabled
  };
  return esCfgDraft;
}
function esDraftComplete(){
  const d=esCfgDraftInit();
  return ES_REQUIRED.every(function(k){return !!String(d[k]||'').trim();});
}
function esDraftDirty(){
  const d=esCfgDraftInit();
  return ES_REQUIRED.concat(['enabled']).some(function(k){return d[k]!==ESIGN_CFG[k];});
}
/* The tab is inside the entity panel, so it repaints the way every other tab
   in that panel repaints - the panel's own refresh, not a page render. */
function esCfgRepaint(){
  if(typeof refreshCsSidebar==='function')refreshCsSidebar();
}

/* ── Live field handling ──────────────────────────────────────────────────
   Typing writes to the draft and re-evaluates Save in place. Repainting on
   every keystroke would take the caret out of the field being typed in, so
   only the two things that actually change are touched. */
function esCfgTouch(key,el){
  esCfgDraftInit()[key]=el.value;
  esCfgSyncFoot();
}
function esCfgSelHook(val,csid){
  const map={'es-cfg-provider':'provider','es-cfg-env':'env'};
  const k=map[csid];
  if(!k)return;
  esCfgDraftInit()[k]=val;
  esCfgSyncFoot();
}
function esCfgSyncFoot(){
  const btn=document.getElementById('es-cfg-save');
  const hint=document.getElementById('es-cfg-hint');
  const complete=esDraftComplete();
  if(btn)btn.disabled=!complete;
  if(hint){
    const missing=ES_REQUIRED.filter(function(k){return !String(esCfgDraftInit()[k]||'').trim();});
    hint.textContent=complete
      ?(esDraftDirty()?'Unsaved changes.':'All changes saved.')
      :missing.length+' required field'+(missing.length===1?'':'s')+' still empty.';
  }
}
function esCfgToggleEnabled(){
  esCfgDraftInit().enabled=!esCfgDraftInit().enabled;
  esCfgRepaint();
}
function esCfgReveal(which){
  if(which==='key')esShowKey=!esShowKey;else esShowSecret=!esShowSecret;
  esCfgRepaint();
}
function esCfgDiscard(){
  esCfgDraftInit(true);esTestState=null;esCfgRepaint();
  showToast('Changes discarded','info','The form was reset to the saved configuration.');
}

/* ── Test Connection (US11) ───────────────────────────────────────────────
   Tests the DRAFT, not the saved configuration, because the point of testing
   is to find out whether what you have just typed works. Reports whatever the
   provider said - "the error returned by the API", per the requirement -
   rather than a generic failure. */
function esCfgTest(){
  const d=esCfgDraftInit();
  const missing=ES_REQUIRED.filter(function(k){return !String(d[k]||'').trim();});
  if(missing.length){
    esTestState={ok:false,msg:'Cannot test: '+missing.length+' required field'
      +(missing.length===1?'':'s')+' still empty.'};
    esCfgRepaint();return;
  }
  esTestState='busy';esCfgRepaint();
  setTimeout(function(){
    esTestState={ok:true,msg:'Connection successful. Authenticated against '+d.provider+' '+d.env
      +' as Opendhi Platform (workspace ws_4821).'};
    ESIGN_CFG.workspace='Opendhi Platform · ws_4821';
    const s=stampNow();
    ESIGN_CFG.testedOn=s.date+' | '+s.time;
    esEntityLog('E-Sign connection tested against '+d.provider+' '+d.env+' — '
      +(esTestState.ok?'successful.':'failed. '+esTestState.msg),
      'E-Sign Connection Tested',
      'Connection to '+d.provider+' '+d.env+' was tested and '+(esTestState.ok?'succeeded.':'failed.'));
    esCfgRepaint();
    showToast(esTestState.ok?'Connection successful':'Connection failed',
      esTestState.ok?'success':'error',esTestState.msg);
  },1200);
}
/* Save is the only thing that changes the live integration, and every field it
   moves is named in the entity's log - US11's "changes are audit logged" is
   about the diff, not about the fact that a save happened. */
function esCfgSave(){
  const d=esCfgDraftInit();
  if(!esDraftComplete())return;
  const mask=function(v){return v?'••••'+String(v).slice(-4):'(empty)';};
  const deltas=[];
  if(d.provider!==ESIGN_CFG.provider)deltas.push('Provider: '+ESIGN_CFG.provider+' → '+d.provider);
  if(d.env!==ESIGN_CFG.env)deltas.push('Environment: '+ESIGN_CFG.env+' → '+d.env);
  if(d.baseUrl!==ESIGN_CFG.baseUrl)deltas.push('API Base URL: '+ESIGN_CFG.baseUrl+' → '+d.baseUrl);
  if(d.apiKey!==ESIGN_CFG.apiKey)deltas.push('API Key: '+mask(ESIGN_CFG.apiKey)+' → '+mask(d.apiKey));
  if(d.webhookSecret!==ESIGN_CFG.webhookSecret)deltas.push('Webhook Secret: '+mask(ESIGN_CFG.webhookSecret)+' → '+mask(d.webhookSecret));
  if(d.enabled!==ESIGN_CFG.enabled)deltas.push('Integration: '+(ESIGN_CFG.enabled?'Enabled':'Disabled')+' → '+(d.enabled?'Enabled':'Disabled'));

  ES_REQUIRED.concat(['enabled']).forEach(function(k){ESIGN_CFG[k]=d[k];});
  /* Credentials changed means the last test no longer describes the saved
     configuration, so it is not carried forward as if it did. */
  if(esTestState&&esTestState!=='busy'){
    ESIGN_CFG.connection=esTestState.ok?'ok':'fail';
    ESIGN_CFG.connectionMsg=esTestState.msg;
  }else if(deltas.some(function(x){return /API Key|Webhook Secret|Environment|API Base URL/.test(x);})){
    ESIGN_CFG.connection='untested';
    ESIGN_CFG.connectionMsg='Credentials changed since the last successful test. Run Test Connection again.';
  }
  esEntityLog('E-Sign settings saved. '+(deltas.length?deltas.join(' · '):'No field values changed.'),
    'E-Sign Settings Updated',
    deltas.length?deltas.join(' · '):'Settings re-saved with no field values changed.');
  esCfgRepaint();
  showToast('E-Sign settings saved','success',
    ESIGN_CFG.enabled?'Documents can now be sent for e-sign from Attachments.'
                     :'Integration is disabled. Send to E-sign is unavailable until it is enabled.');
}

/* ── Field builders ───────────────────────────────────────────────────────
   The app's .ep-form-group / .ep-form-label / .ep-form-input inside the
   panel's own two-column grid, so this tab has the rhythm of every other
   editable tab on the panel. */
function esCfgText(key,label,ph,hint,ro,wide){
  const d=esCfgDraftInit();
  return '<div class="ep-form-group'+(ro?' es-ro':'')+(wide?' ep-form-full':'')+'">'
    +'<label class="ep-form-label" for="es-cfg-'+key+'">'+label+(ro?'':' <span class="req">*</span>')+'</label>'
    +'<input class="ep-form-input" id="es-cfg-'+key+'" type="text" autocomplete="off" placeholder="'+attrSafe(ph)+'" '
    +'value="'+attrSafe(ro?ESIGN_CFG.webhookUrl:(d[key]||''))+'"'
    +(ro?' readonly':' oninput="esCfgTouch(\''+key+'\',this)"')+'>'
    +(hint?'<div class="es-hint">'+hint+'</div>':'')
    +'</div>';
}
/* US11: "API Key and Webhook Secret are masked". Masked by default and
   revealed deliberately - the eye is inside the field, so revealing a secret
   is always a decision, never a side effect of focusing something else. */
function esCfgSecret(key,label,ph,hint,shown){
  const d=esCfgDraftInit();
  return '<div class="ep-form-group">'
    +'<label class="ep-form-label" for="es-cfg-'+key+'">'+label+' <span class="req">*</span></label>'
    +'<div class="es-secret">'
      +'<input class="ep-form-input" id="es-cfg-'+key+'" type="'+(shown?'text':'password')+'" '
      +'autocomplete="off" spellcheck="false" placeholder="'+attrSafe(ph)+'" value="'+attrSafe(d[key]||'')+'" '
      +'oninput="esCfgTouch(\''+key+'\',this)">'
      +'<button type="button" class="es-eye" title="'+(shown?'Hide':'Show')+'" '
      +'onclick="esCfgReveal(\''+(key==='apiKey'?'key':'secret')+'\')">'+(shown?ES_ICO.eyeOff:ES_ICO.eye)+'</button>'
    +'</div>'
    +(hint?'<div class="es-hint">'+hint+'</div>':'')
    +'</div>';
}
/* ── The tab ──────────────────────────────────────────────────────────────
   Two blocks, each opening with the .lp-sb-view-header that every section
   of every tab on this panel opens with: what the integration is doing now,
   and the credentials that make it do it. There is no third block for an
   audit trail - that is the Logs tab, two along. */
function csEsignTabHTML(){
  const d=esCfgDraftInit();
  const complete=esDraftComplete();
  const tone=!esCfgComplete()?'bad':(!ESIGN_CFG.enabled?'idle'
    :(ESIGN_CFG.connection==='ok'?'ok':ESIGN_CFG.connection==='fail'?'bad':'wait'));
  const label=!esCfgComplete()?'Incomplete':(!ESIGN_CFG.enabled?'Disabled'
    :(ESIGN_CFG.connection==='ok'?'Connected':ESIGN_CFG.connection==='fail'?'Connection Failing':'Untested'));

  /* 1 — what it is doing right now. "Is this on?" is the question this tab is
     opened with, so it is answered before the credentials are shown. The
     facts are the panel's own field cards. */
  /* The integration reads as a record, in the shared header card every panel
     opens with: what it is, where it points, its state and its switch. The
     old paragraph under it said three things - who does what, and where
     documents are sent from - so those became a two-column split and a
     one-line pointer that takes you there. */
  const prov=sbEsc(ESIGN_CFG.provider);
  const roleList=function(items){return '<ul class="es-role-list">'+items.map(function(t){
    return '<li>'+ES_ICO.check+'<span>'+t+'</span></li>';}).join('')+'</ul>';};
  let html=sbHero({icon:ES_ICO.plug,name:prov+' E-Signing',
      meta:[ESIGN_CFG.env,'NDA &amp; uploaded MSA'],
      status:'<div class="es-toggle"><span class="lp-status-badge tone-'+tone+'">'+label+'</span>'
        +'<span class="es-toggle-lbl">'+(d.enabled?'Enabled':'Disabled')+'</span>'
        +'<button type="button" class="np-switch'+(d.enabled?' on':'')+'" onclick="esCfgToggleEnabled()" '
        +'role="switch" aria-checked="'+(d.enabled?'true':'false')+'" aria-label="Enable integration"></button></div>'})
    +'<div class="es-roles">'
      +'<div class="es-role"><div class="es-role-h">'+ES_ICO.pen+prov+' handles</div>'
        +roleList(['Signing link &amp; signer journey','Signature &amp; signed PDF','Audit certificate'])+'</div>'
      +'<div class="es-role"><div class="es-role-h">'+ES_ICO.shield+'This platform handles</div>'
        +roleList(['Creates the submission','Stores the reference IDs','Tracks status from webhooks'])+'</div>'
    +'</div>'
    +'<div class="es-send-from">'+ES_ICO.info+'<span>Documents are sent for signature from the '
      +'<button type="button" class="att-link es-inline-link" onclick="csSetTab(\'attachments\')">Attachments</button> tab.</span></div>'
    +'<div class="lp-sb-detail-grid">'
      +esFact(ES_ICO.fFlag,'Environment',ESIGN_CFG.env)
      +esFact(ES_ICO.fLink,'API Base URL',ESIGN_CFG.baseUrl)
      +esFact(ES_ICO.fCal,'Last Tested',ESIGN_CFG.testedOn)
      +esFact(ES_ICO.fUser,'Authenticated As',ESIGN_CFG.connection==='ok'?ESIGN_CFG.workspace:null)
    +'</div>';
  /* Only a problem earns a note. A healthy connection is already stated by the
     chip in the heading above, and repeating it in a tinted band underneath
     spends a whole row restating the line above it. */
  if(ESIGN_CFG.connection!=='ok')
    html+='<div class="info-box" style="margin-top:14px"><div class="ib-icon">'+ES_ICO.warn+'</div>'
      +'<div><strong>'+(ESIGN_CFG.connection==='fail'?'Connection failing':'Not tested')+'</strong>'
      +sbEsc(ESIGN_CFG.connectionMsg||'This configuration has not been tested.')+'</div></div>';

  /* 2 — credentials. The webhook URL is read-only on purpose: it is the
     platform's own endpoint, not something an admin chooses, and the only
     useful thing to do with it is copy it into DocuSeal. */
  html+='<div class="es-rule"></div>'
    +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Credentials</span></div>'
    +'<p class="es-tab-sub">Held server-side and never exposed to the browser in a real deployment, and masked '
      +'here for the same reason.</p>'
    +'<div class="ep-form-grid es-cfg-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label">Provider <span class="req">*</span></label>'
        +apCS('es-cfg-provider',ES_PROVIDERS,d.provider,'Select provider','esCfgSelHook')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Environment <span class="req">*</span></label>'
        +apCS('es-cfg-env',ES_ENVS,d.env,'Select environment','esCfgSelHook')
        +'<div class="es-hint">Sandbox submissions are <b>not legally binding</b>.</div></div>'
      +esCfgText('baseUrl','API Base URL','https://api.docuseal.com','',false,true)
      +esCfgSecret('apiKey','API Key','dsk_live_…','Sent as the <b>X-Auth-Token</b> header on every call.',esShowKey)
      +esCfgSecret('webhookSecret','Webhook Secret','whsec_…','Verifies the signature on every inbound callback.',esShowSecret)
      +'<div class="ep-form-group ep-form-full es-ro"><label class="ep-form-label">Webhook URL</label>'
        +'<input class="ep-form-input" type="text" readonly value="'+attrSafe(ESIGN_CFG.webhookUrl)+'">'
        +'<div class="es-hint">Register this in '+sbEsc(ESIGN_CFG.provider)+' so status callbacks reach the platform. '
        +'<button type="button" class="att-link es-inline-link" '
        +'onclick="esCopy('+attrSafe(JSON.stringify(ESIGN_CFG.webhookUrl))+')">'+ES_ICO.copy+' Copy</button></div></div>'
    +'</div>'
    /* State on the left, actions on the right - the footer rule the rest of
       the app follows. */
    +'<div class="es-foot">'
      +'<div class="es-state'+(esTestState==='busy'?' is-idle':esTestState?(esTestState.ok?' is-ok':' is-bad'):' is-idle')+'">'
        +(esTestState==='busy'
          ?'<div class="es-spinner"></div><span>Testing connection…</span>'
          :esTestState?((esTestState.ok?ES_ICO.check:ES_ICO.warn)+'<span>'+sbEsc(esTestState.msg)+'</span>')
          :'<span id="es-cfg-hint">'
            +(complete?(esDraftDirty()?'Unsaved changes.':'All changes saved.')
              :ES_REQUIRED.filter(function(k){return !String(d[k]||'').trim();}).length+' required field(s) still empty.')
            +'</span>')
      +'</div>'
      +'<div class="es-foot-btns">'
        +(esDraftDirty()?'<button class="ep-cancel-btn" onclick="esCfgDiscard()">Discard</button>':'')
        +'<button class="ep-cancel-btn" onclick="esCfgTest()"'+(esTestState==='busy'?' disabled':'')+'>Test Connection</button>'
        +'<button class="ep-save-btn" id="es-cfg-save" onclick="esCfgSave()"'+(complete?'':' disabled')+'>Save</button>'
      +'</div>'
    +'</div>';

  return html;
}
