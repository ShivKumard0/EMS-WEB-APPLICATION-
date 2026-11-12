/* ══ BENEFITS & ELIGIBILITY · ONC CARD ENROLLMENT · CARD PROGRAMMES ═══════════
   OpenDhi's Expense Management is bank-independent. Three things live here,
   in that order of dependence:

   1. BENEFITS & ELIGIBILITY (core). One switch per employee - Benefits
      eligible - set at creation (step 5 of Create New Employee) or later from
      the employee's Benefits tab. Off excludes the person from Wallet &
      Benefits entitlements and allocations. It needs no card, no bank.

   2. ONC CARD ENROLLMENT (optional workflow). ONC is OpenDhi's own card
      programme name. The details a card provider needs to issue an employee's
      card: a provider-neutral KYC set (title, name on card, PAN, occupation,
      income slab, KYC address, delivery, declarations) collected on the
      employee's ONC Card tab, which exists only while the entity has an
      enabled card programme. Master data is reused read-only from the record;
      HR may prefill; the employee may edit, with every change waiting as
      Pending HR Review; the declarations are the employee's alone. Status:
      Not Enrolled → Draft → Pending HR Review → Ready for Card Enrollment.
      Nothing here talks to a bank.

   3. CARD PROGRAMMES AND THE PROVIDER REGISTRY (integration-specific).
      Company Settings → Card Programmes (Opendhi = Super Admin) enables one
      provider per entity - RBL Bank, ICICI Bank, others later - as "Enabled ·
      Not connected" until the integration exists. Each provider's registry
      holds its field codes, which fields it requires, its own extra fields
      (RBL's Source Income Type) and its dropdown values, entered exactly as
      the provider supplies them. The registry adds to the enrollment while
      that provider is enabled; it never controls employee creation, benefits
      or expenses. */

/* ── Core enrollment fields (provider-neutral) ──────────────────────── */
/* src: 'employee' = reused from the record, read-only here | 'onc' = collected
   here.  owner: hr | employee | company | employee-only.  The entity decides
   Show / Mandatory for every core field (defaults below); an enabled provider
   may additionally require a field it names. */
const ONC_INCOME_SLABS=['Up to Rs. 2.5 L','Rs. 2.5 L to 5 L','Rs. 5 L to 10 L','More than Rs. 10 L'];
const ONC_REGISTRY=[
  {k:'title',label:'Title',group:'Personal',src:'onc',owner:'employee',type:'select',opts:['Mr','Ms','Mrs'],defMandatory:true,rule:''},
  {k:'fname',label:'First Name',group:'Reused',src:'employee',owner:'hr',type:'text',defMandatory:true,rule:'As on the ID proof'},
  {k:'lname',label:'Last Name',group:'Reused',src:'employee',owner:'hr',type:'text',defMandatory:true,rule:'As on the ID proof'},
  {k:'email',label:'Email',group:'Reused',src:'employee',owner:'hr',type:'email',defMandatory:true,rule:''},
  {k:'mobile',label:'Mobile Number',group:'Reused',src:'employee',owner:'hr',type:'text',defMandatory:true,rule:'10 digits'},
  {k:'dob',label:'Date of Birth',group:'Reused',src:'employee',owner:'hr',type:'date',defMandatory:true,rule:'18 years or older'},
  {k:'gender',label:'Gender',group:'Reused',src:'employee',owner:'hr',type:'select',defMandatory:true,rule:''},
  {k:'nationality',label:'Nationality',group:'Reused',src:'employee',owner:'hr',type:'select',defMandatory:true,rule:''},
  {k:'empId',label:'Employee ID',group:'Reused',src:'employee',owner:'hr',type:'text',defMandatory:true,rule:''},
  {k:'dept',label:'Department',group:'Reused',src:'employee',owner:'hr',type:'text',defMandatory:false,rule:''},
  {k:'designation',label:'Designation',group:'Reused',src:'employee',owner:'hr',type:'text',defMandatory:false,rule:''},
  {k:'branch',label:'Work Location / Branch',group:'Reused',src:'employee',owner:'hr',type:'text',defMandatory:false,rule:''},
  {k:'nameOnCard',label:'Name on Card',group:'Card',src:'onc',owner:'employee',type:'text',defMandatory:true,rule:'Letters and spaces, 2 to 26 characters, as on PAN'},
  {k:'pan',label:'PAN Number',group:'KYC',src:'onc',owner:'employee',type:'text',defMandatory:true,rule:'10 characters: AAAAA9999A',bank:true},
  {k:'occupation',label:'Occupation',group:'KYC',src:'onc',owner:'employee',type:'text',defMandatory:true,rule:''},
  {k:'annualIncome',label:'Annual Income',group:'KYC',src:'onc',owner:'employee',type:'select',opts:ONC_INCOME_SLABS,defMandatory:true,rule:'Income slab'},
  {k:'sourceOfIncome',label:'Source of Income',group:'KYC',src:'onc',owner:'employee',type:'select',opts:['Salaried'],defMandatory:true,rule:'Salaried for Direct employees'},
  {k:'addr1',label:'KYC Address Line 1',group:'Address',src:'onc',owner:'employee',type:'text',defMandatory:true,rule:'',bank:true},
  {k:'addr2',label:'KYC Address Line 2',group:'Address',src:'onc',owner:'employee',type:'text',defMandatory:true,rule:'',bank:true},
  {k:'addr3',label:'KYC Address Line 3',group:'Address',src:'onc',owner:'employee',type:'text',defMandatory:false,rule:'Optional',bank:true},
  {k:'city',label:'City',group:'Address',src:'onc',owner:'employee',type:'text',defMandatory:true,rule:'',bank:true},
  {k:'state',label:'State',group:'Address',src:'onc',owner:'employee',type:'text',defMandatory:true,rule:'',bank:true},
  {k:'pincode',label:'Pincode',group:'Address',src:'onc',owner:'employee',type:'text',defMandatory:true,rule:'6 digits',bank:true},
  {k:'delivery',label:'Card Delivery',group:'Card',src:'onc',owner:'employee',type:'select',opts:['Office branch','KYC address'],defMandatory:true,rule:''},
  {k:'declConsent',label:'Consent to share my details with the card provider for card issuance and KYC',group:'Declarations',src:'onc',owner:'employee-only',type:'decl',defMandatory:true,rule:'Accepted by the employee only'},
  {k:'declPep',label:'I am not a Politically Exposed Person',group:'Declarations',src:'onc',owner:'employee-only',type:'decl',defMandatory:true,rule:'Accepted by the employee only'},
  {k:'declTrue',label:'Details are true and my name matches PAN',group:'Declarations',src:'onc',owner:'employee-only',type:'decl',defMandatory:true,rule:'Accepted by the employee only'}
];
/* Provider-specific extra fields. They exist in the enrollment only while
   their provider's programme is enabled. */
const ONC_PROVIDER_EXTRA=[
  {k:'sourceIncomeType',provider:'rbl',label:'Source Income Type',group:'KYC',src:'onc',owner:'employee',type:'select',opts:[],defMandatory:false,rule:'Values awaited from the provider'}
];
const ONC_GROUPS=['Reused','Personal','KYC','Address','Card','Declarations'];
/* A company's own enrollment fields (Card Enrollment → Add Field), per entity. */
const oncCustomFieldBook={};
function oncCustomFields(ent){ent=ent||idEntity();return oncCustomFieldBook[ent]||(oncCustomFieldBook[ent]=[]);}
function oncFields(){const p=oncProviderKey();return ONC_REGISTRY.concat(ONC_PROVIDER_EXTRA.filter(function(f){return f.provider===p;}),oncCustomFields());}
function oncField(k){return oncFields().find(function(f){return f.k===k;})||ONC_PROVIDER_EXTRA.find(function(f){return f.k===k;})||null;}

/* ── Card programmes and the provider registry ───────────────────────── */
const ONC_PROVIDERS=[
  {key:'rbl',name:'RBL Bank',card:'RuPay prepaid multi-wallet card',wallets:['MEAL','FUEL','GIFT','TEL','CORP','REIMB','PERS','NCMC'],integration:'Not connected'},
  {key:'icici',name:'ICICI Bank',card:'Multi-wallet prepaid card',wallets:['MEAL','FUEL','GIFT'],integration:'Not connected'}
];
/* ONC_PROVIDERS and ONC_PROVIDER_REG are the one shared ADT provider
   catalogue. Each entity (by Entity ID) runs at most one programme from it,
   with its own field settings and logs; employees, benefits and expenses
   never need one. The home entity has RBL enabled (the pilot). */
const oncProgrammes={},oncProgLogBook={};
oncProgrammes[ID_HOME_ENTITY]={provider:'rbl',enabledOn:'15 Oct 2026',by:'Shaun Mathew',byId:(idUserByEmail('shaun@testemp.com')||{}).userId||''};
oncProgLogBook[ID_HOME_ENTITY]=[{date:'15 Oct 2026',time:'10:00:00 AM',user:'Shaun Mathew',status:'Enabled',action:'RBL Bank card programme enabled for the entity. Integration not connected.'}];
function oncProg(ent){ent=ent||idEntity();return oncProgrammes[ent]||(oncProgrammes[ent]={provider:null,enabledOn:null,by:'',byId:''});}
function oncProgLogs(ent){ent=ent||idEntity();return oncProgLogBook[ent]||(oncProgLogBook[ent]=[]);}
function oncProviderKey(){return oncProg().provider||'';}
function oncProvider(){return ONC_PROVIDERS.find(function(p){return p.key===oncProg().provider;})||null;}
function oncProgrammeOn(){return !!oncProvider();}
function oncProviderName(){const p=oncProvider();return p?p.name:'the card provider';}
/* Per provider, per field: the provider's code, whether it requires the field,
   whether the provider has confirmed the field and its values. Entered by
   Opendhi exactly as the provider supplies them. */
const ONC_PROVIDER_REG={
  rbl:{title:{code:'TITLE',required:true,confirmed:true},fname:{code:'FIRST_NAME',required:true,confirmed:true},lname:{code:'LAST_NAME',required:true,confirmed:true},
    email:{code:'EMAIL',required:true,confirmed:true},mobile:{code:'MOBILE',required:true,confirmed:true,rule:'+91 and 10 digits'},dob:{code:'DOB',required:true,confirmed:true,rule:'DD-MM-YYYY'},
    gender:{code:'GENDER',required:true,confirmed:true},nationality:{code:'NATIONALITY',required:true,confirmed:true,rule:'Indian for a RuPay prepaid card'},empId:{code:'EMPLOYEE_ID',required:true,confirmed:true},
    designation:{code:'DESIGNATION',required:false,confirmed:true},nameOnCard:{code:'NAME_ON_CARD',required:false,confirmed:true},pan:{code:'PAN',required:true,confirmed:true},
    occupation:{code:'OCCUPATION',required:true,confirmed:true},annualIncome:{code:'ANNUAL_INCOME',required:true,confirmed:true},sourceOfIncome:{code:'SOURCE_OF_INCOME',required:true,confirmed:true},
    sourceIncomeType:{code:'SOURCE_INCOME_TYPE',required:false,confirmed:false},addr1:{code:'ADDRESS_LINE_1',required:true,confirmed:true},addr2:{code:'ADDRESS_LINE_2',required:true,confirmed:true},
    addr3:{code:'ADDRESS_LINE_3',required:false,confirmed:true},city:{code:'CITY',required:true,confirmed:true},state:{code:'STATE',required:true,confirmed:true},pincode:{code:'PINCODE',required:true,confirmed:true},
    delivery:{code:'CARD_DELIVERY',required:false,confirmed:true},declConsent:{code:'DECL_CONSENT',required:true,confirmed:true},declPep:{code:'DECL_PEP',required:true,confirmed:true},declTrue:{code:'DECL_TRUE',required:true,confirmed:true}},
  icici:{}
};
const oncProviderRegBook=ONC_PROVIDER_REG,oncProviderExtraBook=ONC_PROVIDER_EXTRA;
function oncProvReg(k){const p=oncProviderKey();return (ONC_PROVIDER_REG[p]||{})[k]||null;}
/* A field the enabled provider requires is locked on and mandatory. */
function oncLocked(f){const r=oncProvReg(f.k);return !!(r&&r.required&&r.confirmed);}
const oncProgEdit={reg:null};   // provider registry row being edited
function oncProgrammeEnable(key){
  if(!emsCan('onc.programme.manage')){emsDeny('change card programmes');return;}
  const p=ONC_PROVIDERS.find(function(x){return x.key===key;});if(!p)return;
  const s=stampNow();
  if(oncProg().provider===key){
    oncProg().provider=null;oncProg().enabledOn=null;
    oncProgLogs().unshift({date:s.date,time:s.time,user:wbActor(),userId:wbActorId(),status:'Disabled',action:p.name+' card programme disabled. Enrollment data is kept; the ONC Card tab is hidden until a programme is enabled.'});
    refreshCsSidebar();showToast(p.name+' disabled','success','Benefits, policies, entitlements and allocations are unaffected.');return;
  }
  if(oncProg().provider){showToast('One connected provider per entity','error','Disable '+oncProviderName()+' first.');return;}
  oncProg().provider=key;oncProg().enabledOn=s.date;oncProg().by=wbActor();oncProg().byId=idMe();
  oncProgLogs().unshift({date:s.date,time:s.time,user:wbActor(),userId:wbActorId(),status:'Enabled',action:p.name+' card programme enabled for the entity. Integration '+p.integration.toLowerCase()+'.'});
  refreshCsSidebar();showToast(p.name+' enabled','success','ONC Card enrollment is now available on employee records. Card issuance needs the integration, which is '+p.integration.toLowerCase()+'.');
}
function oncProgrammeTabHTML(){
  /* Corporate Cards (Build 7): the entity's programmes under its provider, and demo mode (js/cards-ui.js). */
  const cc=typeof ccProgrammesSectionHTML==='function'?ccProgrammesSectionHTML():'';
  if(!emsCan('onc.programme.manage'))return cc||'<div class="wb-empty-sm">Card programmes are managed by Opendhi.</div>';
  const rows=ONC_PROVIDERS.map(function(p,i){
    const on=oncProg().provider===p.key;
    return '<tr><td class="csag-td csag-num">'+(i+1)+'</td>'
      +'<td class="csag-td" style="white-space:normal"><div class="lp-c-main">'+sbEsc(p.name)+'</div><div class="lp-c-sub">'+sbEsc(p.card)+' · wallets: '+p.wallets.map(wbTypeName).join(', ')+'</div></td>'
      +'<td class="csag-td">'+(on?axBadge('ok','Enabled')+'<div class="lp-c-sub">'+sbEsc(p.integration)+' · since '+sbEsc(oncProg().enabledOn||'')+'</div>':axBadge('idle','Not enabled'))+'</td>'
      +'<td class="csag-td csag-act"><button class="btn btn-outline btn-sm" onclick="oncProgrammeEnable(\''+p.key+'\')">'+(on?'Disable':'Enable')+'</button></td></tr>';
  }).join('');
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Card Programmes</span></div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Sr. No</th><th>Provider</th><th>Status</th><th class="csag-act">Action</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    +cc;   // its change log: Company Settings → Activity & Audit → Logs
}
function oncRegOpen(k){if(!emsCan('onc.registry.manage')){emsDeny('edit the provider field registry');return;}if(!oncProgrammeOn()){showToast('No programme enabled','info');return;}oncProgEdit.reg=k;refreshCsSidebar();}
function oncRegClose(){oncProgEdit.reg=null;refreshCsSidebar();}
function oncRegSave(){
  const f=oncField(oncProgEdit.reg);if(!f)return;
  const p=oncProviderKey();const reg=ONC_PROVIDER_REG[p]||(ONC_PROVIDER_REG[p]={});
  const r=reg[f.k]||(reg[f.k]={code:'',required:false,confirmed:false});
  const code=(document.getElementById('oncr-code')||{}).value||'',rule=(document.getElementById('oncr-rule')||{}).value||'';
  const req=!!(document.getElementById('oncr-req')||{}).checked,conf=!!(document.getElementById('oncr-conf')||{}).checked;
  const optsEl=document.getElementById('oncr-opts');
  const was=JSON.stringify([r.code,r.rule||'',r.required,r.confirmed,(f.opts||[]).join(', ')]);
  r.code=code.trim().toUpperCase().replace(/[^A-Z0-9_]/g,'_');r.rule=rule.trim();r.required=req;r.confirmed=conf;
  if(optsEl&&f.type==='select'&&f.provider)f.opts=optsEl.value.split(/\r?\n|,/).map(function(x){return x.trim();}).filter(Boolean);
  if(f.type==='select'&&f.provider&&!f.opts.length)r.confirmed=false;
  const changed=was!==JSON.stringify([r.code,r.rule||'',r.required,r.confirmed,(f.opts||[]).join(', ')]);
  oncCfgLogs.unshift(oncLog('Registry',oncProviderName()+' · '+f.label+': '+(changed?'code '+(r.code||'—')+', required '+(r.required?'yes':'no')+', confirmed '+(r.confirmed?'yes':'no')+(f.provider&&f.type==='select'?', values: '+((f.opts||[]).join(', ')||'none'):''):'no change')+'.'));
  oncProgEdit.reg=null;refreshCsSidebar();
  showToast('Registry updated','success',f.label+(changed?'':' · no change')+'.');
}
function oncRegistryTabHTML(){
  if(!emsCan('onc.registry.manage'))return '<div class="wb-empty-sm">The card provider registry is managed by Opendhi.</div>';
  if(!oncProgrammeOn())return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Card Provider Registry</span></div><div class="wb-empty-sm">Enable a card programme first (Company Settings → Card Programmes).</div>';
  const rows=oncFields().map(function(f,i){
    const r=oncProvReg(f.k)||{code:'',required:false,confirmed:false,rule:''};
    if(oncProgEdit.reg===f.k){
      return '<tr class="csr-editing"><td class="csag-td csag-num">'+(i+1)+'</td><td class="csag-td" colspan="3"><div class="csr-add"><div class="csr-add-hd"><span class="lp-sb-section-title">'+sbEsc(f.label)+'</span></div>'
        +'<div class="ep-form-grid">'
        +'<div class="ep-form-group"><label class="ep-form-label">'+sbEsc(oncProviderName())+' field code</label><input class="ep-form-input" id="oncr-code" value="'+attrSafe(r.code||'')+'" placeholder="e.g. SOURCE_INCOME_TYPE"></div>'
        +'<div class="ep-form-group"><label class="ep-form-label">Provider validation rule</label><input class="ep-form-input" id="oncr-rule" value="'+attrSafe(r.rule||'')+'"></div>'
        +(f.type==='select'&&f.provider?'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Dropdown values (exactly as the provider supplies, one per line)</label><textarea class="ep-form-input ax-notes" id="oncr-opts">'+sbEsc((f.opts||[]).join('\n'))+'</textarea><div class="ea-hint">Leave empty until the provider sends the values; the field then stays optional.</div></div>':'')
        +'<div class="ep-form-group"><label class="onc-decl"><input type="checkbox" id="oncr-req"'+(r.required?' checked':'')+'><span>Provider requires this field</span></label></div>'
        +'<div class="ep-form-group"><label class="onc-decl"><input type="checkbox" id="oncr-conf"'+(r.confirmed?' checked':'')+'><span>Provider has confirmed the field and its values</span></label></div>'
        +'</div><div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="oncRegClose()">Cancel</button><button class="ep-save-btn" onclick="oncRegSave()">Save</button></div></div></td></tr>';
    }
    return '<tr><td class="csag-td csag-num">'+(i+1)+'</td>'
      +'<td class="csag-td" style="white-space:normal"><div class="lp-c-main">'+sbEsc(f.label)+(f.provider?' <span class="wb-muted">provider field</span>':'')+'</div><div class="lp-c-sub">'+f.group+' · '+f.type
        +(f.type==='select'?' · '+((f.opts||[]).length?(f.opts||[]).join(', '):'no values yet'):'')+(r.rule?' · '+sbEsc(r.rule):'')+'</div></td>'
      +'<td class="csag-td">'+(r.code?'<code>'+sbEsc(r.code)+'</code>':'<span class="wb-muted">—</span>')
        +'<div class="lp-c-sub">'+(r.required&&r.confirmed?'<span class="lp-status-badge tone-info">Required</span>':r.confirmed?'<span class="lp-status-badge tone-ok">Confirmed</span>':'<span class="lp-status-badge tone-wait">Awaiting provider</span>')+'</div></td>'
      +'<td class="csag-td csag-act"><button class="att-row-btn" title="Edit" onclick="oncRegOpen(\''+f.k+'\')">'+SB_PEN+'</button></td></tr>';
  }).join('');
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Card Provider Registry · '+sbEsc(oncProviderName())+'</span></div>'
    +'<div class="wb-note">Provider field codes and values for card enrollment, maintained by Opendhi.</div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Sr. No</th><th>Field · type · values · rule</th><th>Code · status</th><th class="csag-act">Action</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'';   // its change log: Company Settings → Activity & Audit → Logs
}

/* ── Entity configuration: Show / Mandatory per core field ──────────── */
/* Show / Mandatory per field, per entity. */
const oncCfgBook={};
function oncCfgOf(ent){
  ent=ent||idEntity();
  if(!oncCfgBook[ent]){const c={};ONC_REGISTRY.concat(ONC_PROVIDER_EXTRA).forEach(function(f){c[f.k]={show:true,mandatory:!!f.defMandatory};});oncCfgBook[ent]=c;}
  return oncCfgBook[ent];
}
function oncShown(f){
  if(f.provider)return oncProviderKey()===f.provider;
  return oncCfgOf()[f.k]?oncCfgOf()[f.k].show!==false:true;
}
function oncMandatory(f){
  if(oncLocked(f))return true;
  if(f.provider){const r=oncProvReg(f.k);return !!(r&&r.confirmed&&oncCfgOf()[f.k]&&oncCfgOf()[f.k].mandatory);}
  return !!(oncCfgOf()[f.k]&&oncCfgOf()[f.k].mandatory);
}
function oncCfgToggle(k,what){
  if(!emsCan('onc.config.manage')){emsDeny('change ONC enrollment settings');return;}
  const f=oncField(k);if(!f)return;
  if(oncLocked(f)){showToast('Required by '+oncProviderName(),'info',f.label+' is always shown and mandatory while this programme is enabled.');return;}
  if(f.provider){const r=oncProvReg(f.k);if(what==='mandatory'&&!(r&&r.confirmed)){showToast('Not confirmed by '+oncProviderName(),'info',f.label+' cannot be mandatory until the provider confirms it (Card Enrollment → Edit).');return;}}
  const c=oncCfgOf()[k]||(oncCfgOf()[k]={show:true,mandatory:false});
  if(what==='show'){c.show=!c.show;if(!c.show)c.mandatory=false;}
  else{c.mandatory=!c.mandatory;if(c.mandatory)c.show=true;}
  oncCfgLogs.unshift(oncLog('Config',f.label+': '+(what==='show'?'Show':'Mandatory')+' '+(c[what]?'on':'off')+'.'));
  refreshCsSidebar();
}
const oncCfgLogs=[];
function oncLog(status,action){const s=stampNow();return {date:s.date,time:s.time,user:typeof wbActor==='function'?wbActor():CURRENT_USER,userId:idMe(),entity:idEntity(),status:status,action:action};}
/* Card Enrollment (product owner, 10 Nov 2026): one list of the enrollment fields, with the Card Provider Registry
   merged in. Each row: this company's Show / Mandatory, and the provider's code and status. Edit (✎):
   - a field of the platform list: the provider mapping (code, values, rule, required, confirmed) - OpenDhi only,
     because it is shared by every company on that provider; the company sets Show / Mandatory in the row;
   - a company's own field: its name, type, values, group and help text - the company.
   Add Field: a company field (this company only, kept in ADT), or - OpenDhi - a provider field for every company
   on the provider, with its provider code. Changes are logged in Company Settings → Logs. */
const ONC_CUSTOM_TYPES=['Text','Dropdown'];
const ONC_CUSTOM_GROUPS=['Personal','KYC','Address','Card'];
let oncFieldForm=null;
function oncFieldCanEdit(f){
  if(f.custom)return emsCan('onc.config.manage')&&f.entity===idEntity();
  return emsCan('onc.registry.manage')&&oncProgrammeOn();
}
function oncFieldAddOpen(){
  if(!emsCan('onc.config.manage')&&!emsCan('onc.registry.manage')){emsDeny('add enrollment fields');return;}
  oncProgEdit.reg=null;oncFieldForm={k:null,label:'',type:'Text',opts:'',group:'Personal',rule:'',scope:'company',code:''};refreshCsSidebar();
}
function oncFieldEditOpen(k){
  const f=oncField(k);if(!f)return;
  if(!f.custom){oncFieldForm=null;oncRegOpen(k);return;}
  if(!oncFieldCanEdit(f)){emsDeny('edit this field');return;}
  oncProgEdit.reg=null;oncFieldForm={k:f.k,label:f.label,type:f.type==='select'?'Dropdown':'Text',opts:(f.opts||[]).join('\n'),group:f.group,rule:f.rule||'',scope:'company',code:''};refreshCsSidebar();
}
function oncFieldClose(){oncFieldForm=null;refreshCsSidebar();}
function oncFieldSync(){
  const f=oncFieldForm;if(!f)return;
  const v=function(id){const el=document.getElementById(id);return el?el.value:null;},cs=function(id){return document.getElementById('csw-'+id)?getCSValue(id):null;};
  let x;
  if((x=v('oncf-label'))!=null)f.label=x;if((x=v('oncf-opts'))!=null)f.opts=x;if((x=v('oncf-rule'))!=null)f.rule=x;if((x=v('oncf-code'))!=null)f.code=x;
  if((x=cs('oncf-type'))!=null)f.type=x;if((x=cs('oncf-group'))!=null)f.group=x;
  if((x=cs('oncf-scope'))!=null)f.scope=x.indexOf('This company')===0?'company':'provider';
}
function oncFieldHook(){oncFieldSync();refreshCsSidebar();}
function oncFieldSave(){
  oncFieldSync();const d=oncFieldForm;if(!d)return;
  const label=String(d.label||'').trim(),opts=String(d.opts||'').split(/\r?\n|,/).map(function(x){return x.trim();}).filter(Boolean),drop=d.type==='Dropdown';
  if(label.length<2||label.length>40){showToast('Field name: 2 to 40 characters','error');return;}
  if(ONC_CUSTOM_TYPES.indexOf(d.type)<0||ONC_CUSTOM_GROUPS.indexOf(d.group)<0){showToast('Pick the type and the group','error');return;}
  if(drop&&opts.length<2){showToast('A dropdown needs at least two values','error','One per line.');return;}
  const clash=oncFields().find(function(f){return f.label.toLowerCase()===label.toLowerCase()&&f.k!==d.k;});
  if(clash){showToast('A field named '+clash.label+' already exists','error');return;}
  const def={label:label,group:d.group,type:drop?'select':'text',opts:drop?opts:[],rule:String(d.rule||'').trim()};
  if(d.k){   // a company field, edited
    const f=oncField(d.k);if(!f||!oncFieldCanEdit(f)){emsDeny('edit this field');return;}
    const was=JSON.stringify([f.label,f.group,f.type,f.opts,f.rule]);Object.assign(f,def);
    if(was!==JSON.stringify([f.label,f.group,f.type,f.opts,f.rule]))oncCfgLogs.unshift(oncLog('Config','Company field '+f.label+' edited ('+f.group+', '+(drop?'dropdown: '+opts.join(', '):'text')+').'));
    oncFieldForm=null;refreshCsSidebar();showToast('Field saved','success',f.label+'.');return;
  }
  if(d.scope==='provider'){
    if(!emsCan('onc.registry.manage')){emsDeny('add a provider field');return;}
    const pk=oncProviderKey();if(!pk){showToast('No card programme is enabled','error');return;}
    const code=String(d.code||'').trim().toUpperCase().replace(/[^A-Z0-9_]/g,'_');if(code.length<2){showToast('Enter the provider field code','error');return;}
    const k='pf'+(ONC_PROVIDER_EXTRA.length+1)+'_'+code.toLowerCase().replace(/_/g,'').slice(0,12);
    ONC_PROVIDER_EXTRA.push(Object.assign({k:k,provider:pk,src:'onc',owner:'employee',defMandatory:false},def));
    const reg=ONC_PROVIDER_REG[pk]||(ONC_PROVIDER_REG[pk]={});reg[k]={code:code,required:false,confirmed:!drop||opts.length>0,rule:def.rule};
    oncCfgLogs.unshift(oncLog('Registry',oncProviderName()+' field added: '+label+' (code '+code+', '+d.group+'). It applies to every company on '+oncProviderName()+'.'));
    oncFieldForm=null;refreshCsSidebar();showToast('Provider field added','success',label+' · '+code+'.');return;
  }
  if(!emsCan('onc.config.manage')){emsDeny('add enrollment fields');return;}
  const list=oncCustomFields(),k='cf'+Date.now().toString(36);
  list.push(Object.assign({k:k,src:'onc',owner:'employee',defMandatory:false,custom:true,entity:idEntity()},def));
  oncCfgOf()[k]={show:true,mandatory:false};
  oncCfgLogs.unshift(oncLog('Config','Company field added: '+label+' ('+d.group+', '+(drop?'dropdown: '+opts.join(', '):'text')+'). Shown, not mandatory.'));
  oncFieldForm=null;refreshCsSidebar();showToast('Field added','success',label+' · shown on the employee\'s card enrollment form.');
}
function oncFieldRemove(k){
  const f=oncField(k);if(!f||!f.custom||!oncFieldCanEdit(f)){emsDeny('remove this field');return;}
  if(!window.confirm('Remove '+f.label+'? Values already entered stay in each employee\'s record.'))return;
  const list=oncCustomFields(),i=list.indexOf(f);if(i>=0)list.splice(i,1);
  oncCfgLogs.unshift(oncLog('Config','Company field removed: '+f.label+'.'));
  oncFieldForm=null;refreshCsSidebar();showToast('Field removed','success',f.label+'.');
}
function oncFieldFormHTML(){
  const d=oncFieldForm,edit=!!d.k,canReg=emsCan('onc.registry.manage')&&oncProgrammeOn(),prov=!edit&&d.scope==='provider';
  const fg=function(label,req,html,hint,full){return '<div class="ep-form-group'+(full?' ep-form-full':'')+'"><label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'+html+(hint?'<div class="ea-hint">'+hint+'</div>':'')+'</div>';};
  return '<div class="csr-add"><div class="csr-add-hd"><span class="lp-sb-section-title">'+(edit?'Edit Field':'Add Field')+'</span></div><div class="ep-form-grid">'
    +(!edit&&canReg?fg('Field For',true,apCS('oncf-scope',['This company only','All companies on '+oncProviderName()],prov?'All companies on '+oncProviderName():'This company only','Select','oncFieldHook'),
      prov?'A provider field: sent to '+sbEsc(oncProviderName())+' under its code, for every company on it.':'Kept in ADT for this company; not sent to the provider.'):'')
    +fg('Field Name',true,'<input class="ep-form-input" id="oncf-label" value="'+attrSafe(d.label)+'" placeholder="e.g. Employee Grade">')
    +fg('Field Type',true,apCS('oncf-type',ONC_CUSTOM_TYPES,d.type,'Select','oncFieldHook'))
    +fg('Group',true,apCS('oncf-group',ONC_CUSTOM_GROUPS,d.group,'Select'))
    +(prov?fg(sbEsc(oncProviderName())+' Field Code',true,'<input class="ep-form-input" id="oncf-code" value="'+attrSafe(d.code)+'" placeholder="e.g. EMPLOYEE_GRADE">'):'')
    +(d.type==='Dropdown'?fg('Dropdown Values',true,'<textarea class="ep-form-input ax-notes" id="oncf-opts" placeholder="One per line">'+sbEsc(d.opts)+'</textarea>','',true):'')
    +fg('Help Text',false,'<input class="ep-form-input" id="oncf-rule" value="'+attrSafe(d.rule)+'" placeholder="Shown under the field">','',true)
    +'</div><div class="lp-sb-form-actions">'+(edit?'<button class="ep-cancel-btn" style="margin-right:auto" onclick="oncFieldRemove(\''+d.k+'\')">Remove Field</button>':'')
    +'<button class="ep-cancel-btn" onclick="oncFieldClose()">Cancel</button><button class="ep-save-btn" onclick="oncFieldSave()">'+(edit?'Save':'Add Field')+'</button></div></div>';
}
/* The provider mapping of one field (OpenDhi): code, rule, values, required, confirmed. */
function oncRegFormHTML(f){
  const r=oncProvReg(f.k)||{code:'',required:false,confirmed:false,rule:''};
  return '<div class="csr-add"><div class="csr-add-hd"><span class="lp-sb-section-title">'+sbEsc(f.label)+' · '+sbEsc(oncProviderName())+' mapping</span></div>'
    +'<div class="wb-note"><div class="wb-note-sub">Shared by every company on '+sbEsc(oncProviderName())+'. Each company still sets Show and Mandatory in its own list.</div></div>'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">'+sbEsc(oncProviderName())+' field code</label><input class="ep-form-input" id="oncr-code" value="'+attrSafe(r.code||'')+'" placeholder="e.g. SOURCE_INCOME_TYPE"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Provider validation rule</label><input class="ep-form-input" id="oncr-rule" value="'+attrSafe(r.rule||'')+'"></div>'
    +(f.type==='select'&&f.provider?'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Dropdown values (exactly as the provider supplies, one per line)</label><textarea class="ep-form-input ax-notes" id="oncr-opts">'+sbEsc((f.opts||[]).join('\n'))+'</textarea><div class="ea-hint">Leave empty until the provider sends the values; the field then stays optional.</div></div>':'')
    +'<div class="ep-form-group"><label class="onc-decl"><input type="checkbox" id="oncr-req"'+(r.required?' checked':'')+'><span>Provider requires this field</span></label></div>'
    +'<div class="ep-form-group"><label class="onc-decl"><input type="checkbox" id="oncr-conf"'+(r.confirmed?' checked':'')+'><span>Provider has confirmed the field and its values</span></label></div>'
    +'</div><div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="oncRegClose()">Cancel</button><button class="ep-save-btn" onclick="oncRegSave()">Save</button></div></div>';
}
function oncSettingsTabHTML(){
  if(!mcOn('expenses'))return '<div class="wb-empty-sm">The Expenses module is switched off for this entity (Module Control).</div>';
  const can=emsCan('onc.config.manage'),canReg=emsCan('onc.registry.manage')&&oncProgrammeOn(),canAdd=can||canReg,on=oncProgrammeOn();
  const fields=oncFields(),anyEdit=fields.some(oncFieldCanEdit),cols=anyEdit?6:5;
  const rows=fields.map(function(f,i){
    const locked=oncLocked(f),r=oncProvReg(f.k);
    const tog=function(what,v,disabled){
      return disabled?axBadge(v?'ok':'idle',v?'On':'Off')
        :'<label class="cs-toggle"><input type="checkbox"'+(v?' checked':'')+' onchange="oncCfgToggle(\''+f.k+'\',\''+what+'\')"><span class="cs-toggle-slider"></span></label>';
    };
    const rule=f.custom?'<span class="lp-status-badge tone-idle">Company field</span>'
      :locked?'<span class="lp-status-badge tone-info">Provider required</span>':f.provider&&!(r&&r.confirmed)?'<span class="lp-status-badge tone-wait">Awaiting provider</span>':'<span class="lp-status-badge tone-idle">Entity choice</span>';
    const code=!f.custom&&on&&r&&r.code?'<div class="lp-c-sub"><code>'+sbEsc(r.code)+'</code></div>':'';
    const row='<tr'+(oncProgEdit.reg===f.k||(oncFieldForm&&oncFieldForm.k===f.k)?' class="csr-editing"':'')+'><td class="csag-td csag-num">'+(i+1)+'</td>'
      +'<td class="csag-td" style="white-space:normal"><div class="lp-c-main">'+sbEsc(f.label)+'</div><div class="lp-c-sub">'+f.group+(f.src==='employee'?' · from employee record':'')
        +(f.provider?' · '+sbEsc(oncProviderName())+' field':'')+(f.custom?' · '+(f.type==='select'?'dropdown':'text'):'')+'</div></td>'
      +'<td class="csag-td">'+rule+code+'</td>'
      +'<td class="csag-td">'+tog('show',oncShown(f),locked||!can||!!f.provider)+'</td>'
      +'<td class="csag-td">'+tog('mandatory',oncMandatory(f),locked||!can||(f.provider&&!(r&&r.confirmed)))+'</td>'
      +(anyEdit?'<td class="csag-td csag-act">'+(oncFieldCanEdit(f)?'<button class="att-row-btn" title="Edit" onclick="oncFieldEditOpen(\''+f.k+'\')">'+SB_PEN+'</button>':'')+'</td>':'')+'</tr>';
    const form=oncProgEdit.reg===f.k&&canReg?'<tr class="csr-editing"><td></td><td class="csag-td" colspan="'+(cols-1)+'">'+oncRegFormHTML(f)+'</td></tr>'
      :oncFieldForm&&oncFieldForm.k===f.k?'<tr class="csr-editing"><td></td><td class="csag-td" colspan="'+(cols-1)+'">'+oncFieldFormHTML()+'</td></tr>':'';
    return row+form;
  }).join('');
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">ONC Card Enrollment'+(on?' · '+sbEsc(oncProviderName()):'')+'</span></div>'
    +'<div class="wb-note">Which enrollment fields this entity shows and requires'+(on?'; fields '+sbEsc(oncProviderName())+' requires are locked on':'')+'.</div>'
    +(on?'':'<div class="wb-note is-wait">No card programme is enabled, so the ONC Card tab is hidden on employee records. Enable one under Card Programmes.</div>')
    +(oncFieldForm&&!oncFieldForm.k?oncFieldFormHTML():canAdd?'<div class="att-bar csag-bar"><div class="att-bar-actions"><button class="att-link" onclick="oncFieldAddOpen()">'+(typeof CC_ICO!=='undefined'?CC_ICO.plus:'+')+'Add Field</button></div></div>':'')
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Sr. No</th><th>Field</th><th>Rule</th><th>Show</th><th>Mandatory</th>'+(anyEdit?'<th class="csag-act">Action</th>':'')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

/* ── The employee's enrollment and benefits switch ──────────────────── */
const oncData={};   // Employee ID (eid) -> record
function oncRec(eid,create){
  if(!eid)return null;
  if(!oncData[eid]&&create)oncData[eid]={eid:eid,enroll:false,benefitsEligible:true,fields:{},decls:{},pending:null,logs:[],bankVerified:{}};
  return oncData[eid]||null;
}
function oncBenefitsEligible(eid){const r=oncRec(eid);return !r||r.benefitsEligible!==false;}
function oncEmpOf(eid){return eid?(typeof directEmpData!=='undefined'?directEmpData:[]).find(function(e){return e.eid===eid;})||null:null;}
function oncReused(emp,k){
  if(!emp)return '';
  const parts=String(emp.name||'').trim().split(/\s+/);
  switch(k){
    case 'fname':return parts[0]||'';
    case 'lname':return parts.slice(1).join(' ');
    case 'email':return emp.email||'';
    case 'mobile':return emp.contact||'';
    case 'dob':return emp.dob?cdLabel(emp.dob):'';
    case 'gender':return emp.gender||'';
    case 'nationality':return emp.nationality||'';
    case 'empId':return emp.empId||'';
    case 'dept':return emp.dept||'';
    case 'designation':return emp.jobTitle||'';
    case 'branch':return emp.branch||emp.country||'';
  }
  return '';
}
function oncValue(emp,r,k){
  const f=oncField(k);if(!f)return '';
  if(f.src==='employee')return oncReused(emp,k);
  const v=r&&r.fields?r.fields[k]:'';
  if(k==='sourceOfIncome'&&!v)return 'Salaried';
  return v||'';
}
function oncCheckField(f,v,mandatory){
  v=String(v==null?'':v).trim();
  if(!v)return mandatory?f.label+' is required':'';
  /* A PAN on file is kept masked by the presentation environment (D1): ••••••234K stands for a PAN already provided. */
  if(f.k==='pan'&&!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase())&&!/^•{6}[A-Z0-9]{4}$/i.test(v))return 'PAN must be 10 characters like AAAAA9999A';
  if(f.k==='pincode'&&!/^[1-9][0-9]{5}$/.test(v))return 'Pincode must be 6 digits';
  if(f.k==='nameOnCard'&&!/^[A-Za-z][A-Za-z .]{1,25}$/.test(v))return 'Name on Card: letters and spaces, 2 to 26 characters';
  if(f.k==='mobile'&&String(v).replace(/\D/g,'').length<10)return 'Mobile Number must have 10 digits';
  if(f.type==='select'&&f.opts&&f.opts.length&&f.opts.indexOf(v)<0)return f.label+' must be one of the listed values';
  return '';
}
function oncProblems(emp,r){
  const out=[];
  if(!r||!r.enroll)return out;
  oncFields().forEach(function(f){
    if(f.type==='decl'||!oncShown(f))return;
    const msg=oncCheckField(f,oncValue(emp,r,f.k),oncMandatory(f));
    if(msg)out.push({k:f.k,msg:msg,src:f.src});
  });
  return out;
}
/* The wording version of the declarations an acceptance applies to (FR-EMS-EMP-01 §10.5). */
const ONC_DECL_VERSION='1.0';
/* A tax PAN is shown in full only in the edit form; everywhere else, its last four characters. */
function oncMaskId(v){v=String(v||'');return v.length>4?'••••••'+v.slice(-4):v;}
/* Accepted by the employee themselves. A record made through Switch User (possible before 8 Nov 2026)
   never counts as consent (EMP-N15). */
function oncDeclsDone(r){return !!(r&&r.decls&&r.decls.declConsent&&r.decls.declPep&&r.decls.declTrue&&!r.decls.simulated);}
function oncStatus(emp,r){
  if(!r||!r.enroll)return 'Not Enrolled';
  if(r.pending)return 'Pending HR Review';
  if(!oncProblems(emp,r).length&&oncDeclsDone(r))return 'Ready for Card Enrollment';
  return 'Draft';
}
sbToneAdd({'not-enrolled':'idle','pending-hr-review':'wait','ready-for-card-enrollment':'ok','enabled':'ok','disabled':'bad','not-enabled':'idle'});

function oncToggle(eid,what){
  if(!emsCan('onc.enroll.manage')){emsDeny('change enrollment switches');return;}
  if(what==='enroll'&&!oncProgrammeOn()){showToast('No card programme enabled','error','Enable one under Company Settings → Card Programmes.');return;}
  const emp=oncEmpOf(eid),r=oncRec(eid,true);
  const before=oncStatus(emp,r);
  r[what]=!(what==='enroll'?r.enroll:r.benefitsEligible!==false);
  if(what==='enroll'&&!r.enroll)r.pending=null;
  const label=what==='enroll'?'Enroll for ONC card':'Benefits eligible';
  r.logs.unshift(oncLog(what==='enroll'?oncStatus(emp,r):(r.benefitsEligible?'Eligible':'Excluded'),label+' switched '+(r[what]?'on':'off')+'.'));
  oncRefresh(eid);
  showToast(label+' '+(r[what]?'on':'off'),'success',what==='benefitsEligible'?(r[what]?emp.name+' is included in benefit entitlements from the next calculation.':emp.name+' is excluded from benefit entitlements and allocations from the next calculation.'):(before+' → '+oncStatus(emp,r)));
}
function oncRefresh(eid){
  /* The employee panel only while it is on screen (Employees): on My Profile the page itself redraws. */
  if(typeof page!=='undefined'&&page==='employees'&&typeof deSelectedId!=='undefined'&&deSelectedId!=null){const emp=directEmpData.find(function(e){return e.id===deSelectedId;});if(emp&&emp.eid===eid){isbTab('de',renderDeSidebar);return;}}
  renderADTPage();
}

/* ── Edit form (HR prefill, or employee self-service) ──────────────── */
let oncEdit=null;
/* The person acting is the employee themselves: self-service (RBAC onc.enroll.self). */
/* Is this the signed-in person's own record? (Employee ID, never the name.) */
function oncIsSelf(emp){return !!emp&&typeof emsIsMe==='function'&&emsIsMe(emp);}
/* No right to other people's enrollment: only one's own is visible. */
function oncSelfOnly(){return !emsCan('onc.enroll.manage')&&!emsCan('onc.enroll.review')&&!emsCan('onc.config.manage')&&!(emsCan('onc.enroll.view')&&!emsCan('onc.enroll.self'));}
function oncEditable(f){
  if(f.src==='employee'||f.type==='decl')return false;
  const self=oncEdit&&oncIsSelf(oncEmpOf(oncEdit.eid));
  if(self)return f.owner==='employee'&&emsCan('onc.enroll.self');
  return emsCan('onc.enroll.manage');
}
function oncStartEdit(eid){
  const emp=oncEmpOf(eid),r=oncRec(eid,true);
  const self=oncIsSelf(emp);
  if(self&&!emsCan('onc.enroll.self')){emsDeny('edit their own enrollment');return;}
  if(!self&&!emsCan('onc.enroll.manage')){emsDeny('edit ONC enrollment');return;}
  if(!r.enroll){showToast('Not enrolled','info','Switch on "Enroll for ONC card" first.');return;}
  const d={};oncFields().forEach(function(f){if(f.src==='onc'&&f.type!=='decl')d[f.k]=oncValue(emp,r,f.k);});
  /* While HR has not yet reviewed the employee's own submission, the employee may correct it:
     the form opens with what was submitted, and sending it again replaces that submission (product owner, 9 Nov 2026). */
  const resubmit=!!(r.pending&&self);
  if(resubmit)Object.keys(r.pending.fields).forEach(function(k){d[k]=r.pending.fields[k];});
  oncEdit={eid:eid,draft:d,orig:JSON.stringify(d),resubmit:resubmit};
  oncRefresh(eid);
}
function oncCancelEdit(){const id=oncEdit?oncEdit.eid:null;oncEdit=null;if(id)oncRefresh(id);}
function oncSync(){
  if(!oncEdit)return;
  oncFields().forEach(function(f){
    if(f.src!=='onc'||f.type==='decl')return;
    const id='onc-e-'+f.k;
    if(f.type==='select'){if(document.getElementById('csw-'+id))oncEdit.draft[f.k]=getCSValue(id);}
    else{const el=document.getElementById(id);if(el)oncEdit.draft[f.k]=el.value.trim();}
  });
}
/* Required details the employee fills in that would still be empty after this submission. */
function oncSelfMissing(r,d){
  return oncFields().filter(function(f){
    if(f.src!=='onc'||f.type==='decl'||f.owner!=='employee'||!oncShown(f)||!oncMandatory(f))return false;
    if(f.type==='select'&&!(f.opts&&f.opts.length))return false;   // values not yet given by the provider: nothing to pick
    const v=d&&d[f.k]!==undefined?d[f.k]:(r.fields||{})[f.k];
    return !String(v==null?'':v).trim();
  });
}
function oncMarkMissing(miss){
  const keys=miss.map(function(f){return f.k;});
  oncFields().forEach(function(f){
    const w=document.getElementById('csw-onc-e-'+f.k),el=w?w.querySelector('.cs-trigger'):document.getElementById('onc-e-'+f.k);
    if(el)el.style.borderColor=keys.indexOf(f.k)>=0?'var(--st-bad-fg)':'';
  });
}
/* While the employee's submission awaits HR review, the details show what was submitted. */
function oncShownRec(r){return r&&r.pending?Object.assign({},r,{fields:Object.assign({},r.fields,r.pending.fields)}):r;}
function oncSaveEdit(){
  if(!oncEdit)return;
  oncSync();
  const emp=oncEmpOf(oncEdit.eid),r=oncRec(oncEdit.eid,true),d=oncEdit.draft;
  const fs=oncFields();
  for(let i=0;i<fs.length;i++){
    const f=fs[i];if(f.src!=='onc'||f.type==='decl'||!oncShown(f)||!oncEditable(f))continue;
    const msg=oncCheckField(f,d[f.k],false);
    if(msg){showToast(msg,'error');return;}
  }
  if(d.pan)d.pan=d.pan.toUpperCase();
  const self=oncIsSelf(emp);
  /* The employee's own submission is complete: every required detail they fill in has a value (product owner, 9 Nov 2026). */
  if(self){
    const miss=oncSelfMissing(r,d);
    oncMarkMissing(miss);
    if(miss.length){showToast('Complete all required details','error','Missing: '+miss.map(function(f){return f.label;}).join(', ')+'.');return;}
  }
  const changed=Object.keys(d).filter(function(k){const f=oncField(k);return f&&(d[k]||'')!==(r.fields[k]||'')&&oncEditable(f);});
  if(!changed.length){
    const withdrawn=self&&!!r.pending;
    if(withdrawn){r.pending=null;r.logs.unshift(oncLog(oncStatus(emp,r),'Employee withdrew the changes awaiting HR review.'));}
    oncEdit=null;oncRefresh(r.eid);showToast(withdrawn?'Changes withdrawn':'No changes','info');return;
  }
  const summary=changed.map(function(k){return oncField(k).label;}).join(', ');
  /* Own changes always go to someone else for review - HR included. */
  if(self){
    const pend={};changed.forEach(function(k){pend[k]=d[k];});
    const s=stampNow(),again=!!r.pending;
    r.pending={fields:pend,by:idMe(),byName:idMeName(),at:s.date+' | '+s.time};
    r.logs.unshift(oncLog('Pending HR Review',(again?'Employee updated the changes awaiting HR review: ':'Employee submitted changes for review: ')+summary+'.'));
    oncEdit=null;oncRefresh(r.eid);
    showToast(again?'Updated for HR review':'Sent for HR review','success',summary+' will apply once HR approves.');
    return;
  }
  changed.forEach(function(k){r.fields[k]=d[k];});
  r.logs.unshift(oncLog(oncStatus(emp,r),'Enrollment details updated by HR: '+summary+'.'));
  oncEdit=null;oncRefresh(r.eid);
  showToast('Enrollment saved','success',emp.name+' · '+oncStatus(emp,r)+'.');
}
/* In an EMS client company, approving the employee's submitted card KYC details completes
   onboarding (product owner, 9 Nov 2026): document collection and asset / IT access are HR
   modules that do not apply there. The approver's decision is recorded as Verification
   Completed and Admin Access Completed, and the employee becomes Active by the usual
   automatic rule. Not when requested documents are still outstanding - those follow the
   normal steps. OpenDhi's own companies keep the full HR onboarding. Returns true when Active. */
function oncCompleteOnboarding(emp){
  if(!emp||typeof emsClientOnly!=='function'||!emsClientOnly()||typeof empState!=='function'||typeof empPushLog!=='function')return false;
  let st=empState(emp);if(st.phase!=='onb')return false;
  if(st.onb.docReq&&!st.onb.noDocs&&!(typeof empDocsAllAccepted==='function'&&empDocsAllAccepted(emp)))return false;
  const L=typeof empLogs==='function'?empLogs(emp):null,n0=L?L.length:0;
  const why='Card KYC details approved by '+idMeName()+'.';
  if(!st.onb.docReq&&!st.onb.noDocs)
    empPushLog(emp,{type:'doc-request',status:EMP_LOG['doc-request'].label,action:'No documents are collected for card enrollment. '+why,noDocs:true,details:[{label:'Required Documents',value:'No Documents Required'}]});
  st=empState(emp);
  if(!st.onb.verified)
    empPushLog(emp,{type:'verified',status:EMP_LOG.verified.label,action:why,details:[{label:'Verified',value:'Card KYC details'}]});
  st=empState(emp);
  if(!st.onb.assetIt)
    empPushLog(emp,{type:'asset-it',status:EMP_LOG['asset-it'].label,action:'No assets or IT access apply. '+why,details:[{label:'Asset Allocation',value:'Skipped'},{label:'IT Access',value:'Skipped'}]});
  if(typeof empAutoAdvance==='function')empAutoAdvance(emp);
  /* In the presentation, steps taken by a person picked in Switch Role are labelled like every other such action. */
  if(L&&typeof PRES_ON!=='undefined'&&PRES_ON&&typeof presMarkLogs==='function')presMarkLogs(L,n0);
  return emp.status==='Active';
}
function oncReview(eid,approve){
  if(!emsCan('onc.enroll.review')){emsDeny('review enrollment changes');return;}
  const emp=oncEmpOf(eid),r=oncRec(eid,true);if(!r.pending)return;
  if(r.pending.by===idMe()||oncIsSelf(emp)){showToast('Not permitted','error','Changes you submitted, or changes to your own enrollment, must be reviewed by someone else.');return;}
  const inp=document.getElementById('onc-rev-comment');const comment=inp?inp.value.trim():'';
  if(!approve&&!comment){if(inp){inp.style.borderColor='#b83a3a';setTimeout(function(){inp.style.borderColor='';},1500);}showToast('Reason is required to reject','error');return;}
  const keys=Object.keys(r.pending.fields);
  const labels=keys.map(function(k){const f=oncField(k);return f?f.label:k;}).join(', ');
  if(approve){keys.forEach(function(k){r.fields[k]=r.pending.fields[k];});}
  r.pending=null;
  r.logs.unshift(oncLog(oncStatus(emp,r),(approve?'HR approved the employee\'s changes: ':'HR rejected the employee\'s changes: ')+labels+(approve?(comment?'. '+comment:'.'):'. Reason: '+comment)));
  const active=approve&&oncCompleteOnboarding(emp);
  oncRefresh(eid);
  showToast(approve?'Changes approved':'Changes rejected','success',emp.name+(active?' is now Active':'')+' · card enrollment: '+oncStatus(emp,r)+'.');
}
function oncAccept(eid){
  const emp=oncEmpOf(eid),r=oncRec(eid,true);
  if(!oncIsSelf(emp)||!emsCan('onc.enroll.self')){showToast('Only the employee can accept','error','The declarations and consent are personal. HR and Super Admin cannot accept them on an employee\'s behalf.');return;}
  const ticks=['declConsent','declPep','declTrue'].map(function(k){const el=document.getElementById('onc-d-'+k);return el&&el.checked;});
  if(ticks.some(function(t){return !t;})){showToast('Accept all three declarations','error');return;}
  const s=stampNow();
  /* Decision C1 (7 Nov 2026): consent is the employee's own act. Through Switch User it is a simulation -
     allowed only where the entity's demo mode is on, recorded with the person at the keyboard, and never
     shown as legally binding consent. */
  const sim=typeof idSwitched==='function'&&idSwitched();
  if(sim&&oncDeclsDone(r)){showToast('Already accepted personally','info',emp.name+' accepted the declarations personally; an acceptance through Switch User does not replace that consent.');return;}
  /* Never through Switch User, in any company (EMP-N15, 8 Nov 2026): only the employee signed in themselves. */
  if(sim){showToast('Only the employee can accept','error','The declarations must be accepted by the employee signing in themselves.');return;}
  r.decls={declConsent:true,declPep:true,declTrue:true,acceptedBy:emp.name,acceptedById:typeof idMe==='function'?idMe():'',acceptedAt:s.date+' | '+s.time,provider:oncProviderName(),version:ONC_DECL_VERSION,
    simulated:false,actualActor:'',actualActorName:'',session:'Front-end session (production authentication not connected)'};
  r.logs.unshift(oncLog(oncStatus(emp,r),sim?'Declarations recorded through Switch User (illustrative): '+idName(idAuthMe())+' through Switch User as '+emp.name+'. Not legally binding consent; the employee must accept personally.'
    :'Employee accepted the declarations and consent ('+oncProviderName()+').'));
  oncRefresh(eid);
  showToast('Declarations accepted','success',oncStatus(emp,r)+'.');
}

/* ── Employee panel: Benefits tab and ONC Card tab ──────────────────── */
function oncSwitchHTML(emp,r,k,label,sub,on){
  const canSw=emsCan('onc.enroll.manage');
  return '<div class="onc-switch"><div><div class="ea-block-head">'+label+'</div><div class="ea-block-sub">'+sub+'</div></div>'
    +(canSw?'<label class="cs-toggle"><input type="checkbox"'+(on?' checked':'')+' onchange="oncToggle(\''+emp.eid+'\',\''+k+'\')"><span class="cs-toggle-slider"></span></label>'
      :axBadge(on?'ok':'idle',on?'On':'Off'))+'</div>';
}
/* Benefits: the core switch plus what the person is entitled to. */
function oncBenefitsTabHTML(emp){
  if(!mcOn('expenses'))return '<div class="wb-empty-sm">Benefits are part of the Expenses module, which is switched off for this entity.</div>';
  const r=oncRec(emp.eid,true);
  if(oncSelfOnly()&&!oncIsSelf(emp))return '<div class="wb-empty-sm">You can only see your own benefits.</div>';
  return '<div class="onc-head"><div><div class="lp-sb-section-title">Benefits & Eligibility</div><div class="wb-muted">Whether this employee takes part in the entity\'s benefit policies.</div></div>'
    +axBadge(r.benefitsEligible===false?'idle':'ok',r.benefitsEligible===false?'Excluded':'Eligible')+'</div>'
    +oncSwitchHTML(emp,r,'benefitsEligible','Benefits eligible','Off excludes this employee from Wallet & Benefits entitlements and planned allocations. Eligibility by period still follows the 15th-of-month rule.',r.benefitsEligible!==false)
    +(typeof wbMyBenefitsHTML==='function'?wbMyBenefitsHTML(emp):'')
    +(oncProgrammeOn()?'<div class="wb-note">Card: '+sbEsc(oncProviderName())+' programme enabled · enrollment '+sbEsc(oncStatus(emp,r))+' (see the ONC Card tab).</div>':'<div class="wb-note">No card programme is enabled for this entity. Benefits are planned and allocated without a card; stored-value wallets come with a provider integration.</div>');
}
function oncFieldHTML(f,v){
  const id='onc-e-'+f.k,req=oncMandatory(f);
  let ctl;
  if(f.type==='select'){
    const opts=f.opts&&f.opts.length?f.opts:[];
    ctl=opts.length?apCS(id,opts,v||'','Select '+f.label):'<input class="ep-form-input" disabled value="" placeholder="Values awaited from '+attrSafe(oncProviderName())+'">';
  }else ctl='<input class="ep-form-input" id="'+id+'" value="'+attrSafe(v||'')+'" placeholder="'+attrSafe(f.rule||f.label)+'">';
  return '<div class="ep-form-group"><label class="ep-form-label">'+f.label+(req?' <span class="req">*</span>':'')+'</label>'+ctl
    +(f.rule?'<div class="ea-hint">'+sbEsc(f.rule)+'</div>':'')+'</div>';
}
function oncTabHTML(emp){
  if(!mcOn('expenses'))return '<div class="wb-empty-sm">ONC card enrollment is part of the Expenses module, which is switched off for this entity.</div>';
  if(!oncProgrammeOn())return '<div class="wb-empty-sm">No card programme is enabled for this entity (Company Settings → Card Programmes).</div>';
  const r=oncRec(emp.eid,true);
  const status=oncStatus(emp,r),shown=oncShownRec(r),probs=oncProblems(emp,shown),me=oncIsSelf(emp);
  if(oncSelfOnly()&&!me)return '<div class="wb-empty-sm">You can only see your own enrollment.</div>';
  let body='<div class="onc-head"><div><div class="lp-sb-section-title">ONC Card Enrollment · '+sbEsc(oncProviderName())+'</div>'
    +'<div class="wb-muted">The details the card provider needs to issue the card. Nothing is sent to the provider yet.</div></div>'+axBadge(statusTone(status),status)+'</div>'
    +oncSwitchHTML(emp,r,'enroll','Enroll for ONC card','Company decision. Switching it on makes the enrollment fields apply.',!!r.enroll)
    +(typeof ccEmpCardActionsHTML==='function'?ccEmpCardActionsHTML(emp):'');
  if(!r.enroll)return body+'<div class="wb-note">Not enrolled. Switch on "Enroll for ONC card" to collect the details.</div>';   // the log is for HR, not the employee's own view
  const editing=oncEdit&&oncEdit.eid===emp.eid;
  if(r.pending){
    body+='<div class="wb-note is-wait"><b>Pending HR Review</b> · '+sbEsc(idName(r.pending.by)||r.pending.byName||'')+' changed '+Object.keys(r.pending.fields).map(function(k){const f=oncField(k);return f?f.label:k;}).join(', ')+' on '+sbEsc(r.pending.at)+'.'
      +'<table class="att-table csag-table onc-pend"><tbody>'+Object.keys(r.pending.fields).map(function(k){const f=oncField(k);return '<tr><td class="csag-td">'+(f?f.label:k)+'</td><td class="csag-td">'+sbEsc(r.fields[k]||'—')+' → <b>'+sbEsc(r.pending.fields[k]||'—')+'</b></td></tr>';}).join('')+'</tbody></table>'
      +(emsCan('onc.enroll.review')?'<textarea class="lp-logs-form-textarea" id="onc-rev-comment" placeholder="Comment (required to reject)"></textarea>'
        +'<div class="wb-actions"><button class="btn btn-primary btn-sm" onclick="oncReview(\''+emp.eid+'\',true)">Approve changes</button><button class="btn btn-outline btn-sm" onclick="oncReview(\''+emp.eid+'\',false)">Reject</button></div>'
        :'<div class="wb-note-sub">Waiting for HR to review.</div>')+'</div>';
  }
  if(editing){
    const d=oncEdit.draft;
    body+='<div class="lp-sb-edit-form ax-sb-edit"><div class="lp-sb-edit-section">'
      +ONC_GROUPS.filter(function(g){return g!=='Reused'&&g!=='Declarations';}).map(function(g){
        const fs=oncFields().filter(function(f){return f.group===g&&f.src==='onc'&&f.type!=='decl'&&oncShown(f)&&oncEditable(f);});
        if(!fs.length)return '';
        return '<div class="onc-group-h">'+g+'</div><div class="ep-form-grid">'+fs.map(function(f){return oncFieldHTML(f,d[f.k]);}).join('')+'</div>';
      }).join('')
      +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="oncCancelEdit()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="oncSaveEdit()">'+(me?(oncEdit.resubmit?'Resubmit for HR review':'Submit for HR review'):'Save changes')+'</button></div></div></div>';
  }else{
    const canEdit=me?emsCan('onc.enroll.self'):emsCan('onc.enroll.manage');
    body+='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Details</span>'
      +(canEdit?'<button class="lp-sb-view-edit-btn" onclick="oncStartEdit(\''+emp.eid+'\')">'+SB_PEN+' '+(me?'Edit my details':'Edit')+'</button>':'')+'</div>';
    if(probs.length)body+='<div class="wb-note is-wait"><b>'+probs.length+' to complete</b> · '+probs.map(function(p){return sbEsc(p.msg)+(p.src==='employee'?' (employee record)':'');}).join('; ')
      +(me&&canEdit&&probs.some(function(p){return p.src!=='employee';})?'<div class="wb-actions"><button class="btn btn-primary btn-sm" onclick="oncStartEdit(\''+emp.eid+'\')">Complete KYC</button></div>':'')+'</div>';
    ONC_GROUPS.forEach(function(g){
      if(g==='Declarations')return;
      const fs=oncFields().filter(function(f){return f.group===g&&f.type!=='decl'&&oncShown(f);});
      if(!fs.length)return;
      body+='<div class="onc-group-h">'+g+(g==='Reused'?' <span class="wb-muted">from the employee record · HR-controlled</span>':'')+'</div><div class="lp-sb-detail-grid">'
        +fs.map(function(f){
          const v=oncValue(emp,shown,f.k);
          const bad=probs.find(function(p){return p.k===f.k;});
          const waiting=!!(r.pending&&r.pending.fields[f.k]!==undefined);
          return axField(AX_ICO.fTag,f.label+(oncMandatory(f)?' *':''),(v?sbEsc(f.k==='pan'?oncMaskId(v):v):'<span class="wb-warn">'+(bad?'Missing':'—')+'</span>')+(waiting?' <span class="ax-sub">Awaiting HR review</span>':'')+(f.bank&&r.bankVerified[f.k]?' <span class="ax-sub">Provider verified</span>':''));
        }).join('')+'</div>';
    });
  }
  const decls=oncFields().filter(function(f){return f.type==='decl'&&oncShown(f);});
  body+='<div class="onc-group-h">Declarations and consent <span class="wb-muted">accepted by the employee only</span></div>';
  /* Consent given only in a simulated Switch User session is not binding: the employee, signed in themselves, accepts it personally (decision C1). */
  const reAccept=oncDeclsDone(r)&&!!r.decls.simulated&&!!me&&emsCan('onc.enroll.self')&&!(typeof idSwitched==='function'&&idSwitched());
  if(oncDeclsDone(r)&&!reAccept){
    body+='<div class="onc-decls">'+decls.map(function(f){return '<div class="onc-decl is-ok">'+EA_ICONS.tick+'<span>'+sbEsc(f.label)+'</span></div>';}).join('')
      +'<div class="wb-muted">Accepted by '+sbEsc(r.decls.acceptedBy)+' on '+sbEsc(r.decls.acceptedAt)+(r.decls.provider?' for '+sbEsc(r.decls.provider):'')+(r.decls.version?' (version '+sbEsc(r.decls.version)+')':'')+'.'
        +(r.decls.simulated?' <span class="lp-status-badge tone-info">Illustrative</span> Recorded through Switch User by '+sbEsc(r.decls.actualActorName||'')+'; not legally binding consent - the employee must accept personally.':'')+'</div></div>';
  }else if(me&&emsCan('onc.enroll.self')){
    body+=(reAccept?'<div class="wb-note">Your declarations were recorded only through Switch User. Accept them yourself to give binding consent.</div>':'')
      +'<div class="onc-decls">'+decls.map(function(f){return '<label class="onc-decl"><input type="checkbox" id="onc-d-'+f.k+'"><span>'+sbEsc(f.label.replace('the card provider',oncProviderName()))+'</span></label>';}).join('')
      +'<div class="wb-actions"><button class="btn btn-primary btn-sm" onclick="oncAccept(\''+emp.eid+'\')">Accept declarations</button></div></div>';
  }else{
    body+='<div class="onc-decls">'+decls.map(function(f){return '<div class="onc-decl"><span class="onc-decl-box"></span><span>'+sbEsc(f.label)+'</span></div>';}).join('')
      +'<div class="wb-note">Awaiting the employee\'s acceptance. HR and Super Admin cannot accept these on an employee\'s behalf.</div></div>';
  }
  return body;   // the enrollment log is in the employee's Logs tab (js/ems-logs.js)
}
function oncLogTable(logs){
  if(!logs||!logs.length)return '';
  return '<div class="onc-group-h">Log</div><div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>When</th><th>By</th><th>Status</th><th>Action</th></tr></thead><tbody>'
    +logs.map(function(l){return '<tr><td class="csag-td">'+l.date+' '+l.time+'</td><td class="csag-td">'+sbEsc(l.user)+'</td><td class="csag-td">'+axBadge(statusTone(l.status),l.status)+'</td><td class="csag-td" style="white-space:normal">'+sbEsc(l.action)+'</td></tr>';}).join('')
    +'</tbody></table></div>';
}
function oncCfgLogsHTML(kind){
  /* Registry changes are the shared catalogue's; field settings are this entity's. */
  const ls=oncCfgLogs.filter(function(l){return l.status===kind&&(kind==='Registry'||l.entity===idEntity());});
  if(!ls.length)return '';
  return '<div class="wb-proj-h">Changes</div><div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>When</th><th>By</th><th>Change</th></tr></thead><tbody>'
    +ls.map(function(l){return '<tr><td class="csag-td">'+l.date+' '+l.time+'</td><td class="csag-td">'+sbEsc(l.user)+'</td><td class="csag-td" style="white-space:normal">'+sbEsc(l.action)+'</td></tr>';}).join('')+'</tbody></table></div>';
}

/* ── Where the tabs appear ─────────────────────────────────────────── */
function oncCsTabs(){
  const t=[];
  if(mcOn('expenses')&&(emsCan('onc.config.manage')||emsCan('onc.enroll.view')))t.push({id:'onc-enrollment',label:'Card Enrollment'});
  if(emsCan('onc.programme.manage')||emsCan('card.programme.view'))t.push({id:'card-programmes',label:'Card Programmes'});
  return t;
}
/* Benefits for anyone who may view enrollment (own record for an employee);
   ONC Card only while a card programme is enabled. */
function deExtraTabs(emp){
  if(!mcOn('expenses')||!emsCan('onc.enroll.view'))return [];
  if(oncSelfOnly()&&!oncIsSelf(emp))return [];
  const t=[{id:'benefits',label:'Benefits'}];
  if(oncProgrammeOn())t.push({id:'onc-card',label:'ONC Card'});
  return t;
}

/* ── Step 5 of Create New Employee: Benefits & Eligibility ──────────── */
if(typeof EA_STEPS!=='undefined'&&!EA_STEPS.some(function(s){return s.key==='onc';})){
  EA_STEPS.push({key:'onc',title:'Benefits & Eligibility',sub:'Benefits, optional card',
    cardTitle:'Benefits & Eligibility',cardSub:'Whether this employee takes part in benefit policies, and - if a card programme is enabled - the optional ONC card enrollment.',
    fields:[{k:'onc',label:'Benefits & Eligibility',type:'onc',half:false}]});
}
function oncWizardDraft(){
  if(!eaData.onc)eaData.onc={enroll:false,benefitsEligible:true,fields:{sourceOfIncome:'Salaried'}};
  return eaData.onc;
}
function oncWizToggle(what){const d=oncWizardDraft();d[what]=!d[what];renderADTPage();}
function oncWizSet(k,v){oncWizardDraft().fields[k]=v;}
function oncWizSelect(val,id){oncWizSet(id.replace(/^onc-w-/,''),val);}
function oncWizardError(){
  if(eaKind!=='de'||!oncProgrammeOn())return '';
  const d=oncWizardDraft();if(!d.enroll)return '';
  const bad=[];
  oncFields().forEach(function(f){
    if(f.src!=='onc'||f.type==='decl'||!oncShown(f))return;
    const v=d.fields[f.k]||(f.k==='sourceOfIncome'?'Salaried':'');
    const msg=oncCheckField(f,v,oncMandatory(f));if(msg)bad.push(msg);
  });
  return bad.length?bad[0]+(bad.length>1?' (+'+(bad.length-1)+' more)':''):'';
}
function oncWizardBody(){
  const d=oncWizardDraft();
  const sw=function(k,label,sub){
    return '<div class="ea-toggle-row"><div><div class="ea-block-head">'+label+'</div><div class="ea-block-sub">'+sub+'</div></div>'
      +'<label class="cs-toggle"><input type="checkbox"'+(d[k]?' checked':'')+' onchange="oncWizToggle(\''+k+'\')"><span class="cs-toggle-slider"></span></label></div>';
  };
  let html=sw('benefitsEligible','Benefits eligible','On by default. Off excludes this employee from Wallet & Benefits entitlements and planned allocations.');
  if(eaKind!=='de')return html+'<div class="ea-note">ONC card enrollment applies to Direct (India) employees. Global employees are not enrolled.</div>';
  if(!mcOn('expenses'))return html;
  if(!oncProgrammeOn())return html+'<div class="ea-note">No card programme is enabled for this entity, so there is nothing more to collect here. Benefits are planned and allocated without a card.</div>';
  html+='<div class="ea-divider"></div>'+sw('enroll','Enroll for ONC card ('+eaEsc(oncProviderName())+')','Optional. Collect the card details now, or later from the employee\'s ONC Card tab. Standard employee creation does not need them.');
  if(!d.enroll)return html;
  const err=eaShowErrors?oncWizardError():'';
  const reused=oncFields().filter(function(f){return f.src==='employee'&&oncShown(f);});
  html+='<div class="onc-group-h">Reused from the earlier steps</div><div class="ep-form-grid">'
    +reused.map(function(f){
      const v=f.k==='fname'?eaData.fname:f.k==='lname'?eaData.lname:f.k==='email'?eaData.email:f.k==='mobile'?(eaData.dial+' '+eaData.phone).trim():f.k==='dob'?(eaData.dob?cdLabel(eaData.dob):''):f.k==='gender'?eaData.gender:f.k==='nationality'?eaData.nationality:f.k==='empId'?eaData.empId:f.k==='dept'?eaData.dept:f.k==='designation'?eaData.designation:eaData.location;
      return '<div class="ep-form-group"><label class="ep-form-label">'+f.label+(oncMandatory(f)?' <span class="req">*</span>':'')+'</label><div class="ea-locked'+(v?'':' is-muted')+'">'+EA_ICONS.lock+'<span>'+eaEsc(v||'Not filled yet')+'</span></div></div>';
    }).join('')+'</div>';
  ONC_GROUPS.filter(function(g){return g!=='Reused'&&g!=='Declarations';}).forEach(function(g){
    const fs=oncFields().filter(function(f){return f.group===g&&f.src==='onc'&&f.type!=='decl'&&oncShown(f);});
    if(!fs.length)return;
    html+='<div class="onc-group-h">'+g+'</div><div class="ep-form-grid">'+fs.map(function(f){
      const id='onc-w-'+f.k,v=d.fields[f.k]||(f.k==='sourceOfIncome'?'Salaried':''),req=oncMandatory(f);
      let ctl;
      if(f.type==='select'){ctl=f.opts&&f.opts.length?apCS(id,f.opts,v,'Select '+f.label,'oncWizSelect'):'<div class="ea-locked is-muted">Values awaited from '+eaEsc(oncProviderName())+'</div>';}
      else ctl='<input class="ep-form-input" id="'+id+'" value="'+eaEsc(v)+'" placeholder="'+eaEsc(f.rule||f.label)+'" oninput="oncWizSet(\''+f.k+'\',this.value)">';
      return '<div class="ep-form-group"><label class="ep-form-label">'+f.label+(req?' <span class="req">*</span>':'')+'</label>'+ctl+(f.rule?'<span class="ea-hint">'+eaEsc(f.rule)+'</span>':'')+'</div>';
    }).join('')+'</div>';
  });
  html+='<div class="onc-group-h">Declarations and consent</div><div class="ea-note">The employee accepts the three declarations themselves after the record is created (Employees → their record → ONC Card). HR cannot accept them on their behalf.</div>';
  if(err)html+='<span class="ea-err">'+eaEsc(err)+'</span>';
  return html;
}
function oncAfterCreate(rec,d){
  rec.gender=d.gender||'';rec.dob=d.dob||'';rec.nationality=d.nationality||'';rec.idProofs=(d.idProofs||[]).slice();
  const r=oncRec(idEmpRegister(rec).eid,true);
  const o=d.onc||{enroll:false,benefitsEligible:true,fields:{}};
  r.benefitsEligible=o.benefitsEligible!==false;
  r.enroll=!!(o.enroll&&oncProgrammeOn());
  Object.keys(o.fields||{}).forEach(function(k){if(o.fields[k])r.fields[k]=o.fields[k];});
  if(r.fields.pan)r.fields.pan=String(r.fields.pan).toUpperCase();
  r.logs.unshift(oncLog(r.enroll?oncStatus(rec,r):(r.benefitsEligible?'Eligible':'Excluded'),
    'Record created · benefits '+(r.benefitsEligible?'eligible':'excluded')+(r.enroll?' · ONC card enrollment started ('+oncProviderName()+')':'')+'.'));
}

/* ── Seed ──────────────────────────────────────────────────────────── */
(function(){
  const PERSONAL={EMP001:['Male','1996-03-14'],EMP002:['Female','1991-08-22'],EMP003:['Female','1994-11-05'],EMP004:['Male','1990-01-30'],
    EMP005:['Male','1998-06-18'],EMP006:['Female','1995-09-09'],EMP007:['Male','1997-12-01']};
  (typeof directEmpData!=='undefined'?directEmpData:[]).forEach(function(e){
    const p=PERSONAL[e.empId];if(!p)return;
    if(!e.gender)e.gender=p[0];if(!e.dob)e.dob=p[1];if(!e.nationality)e.nationality='India';
  });
  const a=oncRec((idEmpByCode('EMP001',ID_HOME_ENTITY)||{}).eid,true);
  a.enroll=true;a.fields={title:'Mr',nameOnCard:'ANTAR MALHOTRA',pan:'ABCPA1234K',occupation:'Software Engineer',annualIncome:'Rs. 5 L to 10 L',sourceOfIncome:'Salaried',
    addr1:'Flat 12, Green Meadows',addr2:'Sector 70, Mohali',addr3:'',city:'Mohali',state:'Punjab',pincode:'160071',delivery:'Office branch'};
  a.decls={declConsent:true,declPep:true,declTrue:true,acceptedBy:'Antar Malhotra',acceptedAt:'20 Oct 2026 | 10:12:00 AM',provider:'RBL Bank'};
  a.logs=[{date:'20 Oct 2026',time:'10:12:00 AM',user:'Antar Malhotra',status:'Ready for Card Enrollment',action:'Employee accepted the declarations and consent (RBL Bank).'},
          {date:'18 Oct 2026',time:'04:30:00 PM',user:'Pallavi Parate',status:'Draft',action:'Enrollment details prefilled by HR: Title, Name on Card, PAN, Occupation, Annual Income, KYC address.'},
          {date:'18 Oct 2026',time:'04:00:00 PM',user:'Pallavi Parate',status:'Draft',action:'Enroll for ONC card switched on.'}];
  const m=oncRec((idEmpByCode('EMP006',ID_HOME_ENTITY)||{}).eid,true);
  m.enroll=true;m.fields={title:'Ms',nameOnCard:'MEERA IYER',occupation:'UX Designer',annualIncome:'Rs. 5 L to 10 L',sourceOfIncome:'Salaried',city:'Hyderabad',state:'Telangana',delivery:'KYC address'};
  m.logs=[{date:'02 Nov 2026',time:'11:20:00 AM',user:'Pallavi Parate',status:'Draft',action:'Enrollment details prefilled by HR: Title, Name on Card, Occupation, Annual Income, City, State.'},
          {date:'02 Nov 2026',time:'11:00:00 AM',user:'Pallavi Parate',status:'Draft',action:'Enroll for ONC card switched on.'}];
})();
