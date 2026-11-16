/* ══ COMPANY SETTINGS: BASIC AND BANKING DETAILS ARE EDITABLE (product owner, 12 Nov 2026) ═══════════════════════════
   "on clicking Edit from Super Admin or Company Admin it shows 'fields are editable' but it does not allow to edit".
   The two Edit buttons were placeholders. Now, for the Super Admin and the Company Admin, Edit turns the tab's fields
   into a form (Cancel / Save changes) and the saved values are the company's own:
   - Basic Details: Entity Name (the name the company is listed by), Address, City, Employee ID Prefix;
   - Banking Details: Country / Location, Pay Name, Pay Bank, Account Number, IFSC, Swift, Currency, Email, Phone,
     VAT Number, Comments.
   - Basic Details also carries the company's registration (product owner, 16 Nov 2026): Organisation Type, Company /
     Entity PAN, GST Registration Status (Registered / Not Registered), GSTIN (when registered) and CIN / LLPIN, shown
     together after Entity Type and Country and filled in from Edit.
   Base Currency and Timezone keep their own Change. Every save is written to the company's Logs. In the presentation.
   Also: the sign-in page's "Sign up" opens the company form (js/nc-store-fields.js). */
let csEntProfile={};      // entityId → {basic:{label:value}, bank:{label:value}}
let csEditTab=null;       // the tab being edited ('basic-details' | 'banking-details')
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const FIELDS={
    'basic-details':['Entity Name','Organisation Type','Company / Entity PAN','GST Registration Status','GSTIN','CIN / LLPIN','Address','City','Employee ID Pre fix'],
    'banking-details':['Country / Location','Pay Name','Pay Bank','Account Number','IFSC Code','Swift Code','Currency','Email','Phone Number','VAT Number','Comments']
  };
  const WIDE={'Address':1,'Comments':1};
  /* The registration fields: where they sit, what they take. */
  const REG=['Organisation Type','Company / Entity PAN','GST Registration Status','GSTIN','CIN / LLPIN'];
  const GST='GST Registration Status',GST_OPTS=['Registered','Not Registered'];
  const HINT={'Organisation Type':'e.g. Private Limited Company','Company / Entity PAN':'e.g. AAACO1234K','GSTIN':'15 characters','CIN / LLPIN':'CIN or LLPIN, by organisation type'};
  const UPPER={'Company / Entity PAN':1,'GSTIN':1,'CIN / LLPIN':1};
  /* The prepared company's own registration, until it is edited. */
  const PREPARED={'Organisation Type':'Private Limited Company','Company / Entity PAN':'AAFCO4821M','GST Registration Status':'Registered','GSTIN':'36AAFCO4821M1Z5','CIN / LLPIN':'U72900TG2021PTC154873'};
  const prepared=function(){try{const n=typeof presNova==='function'?presNova():null;return !!n&&n.entityId===idEntity();}catch(e){return false;}};
  const canEdit=function(){return typeof emsRole==='function'&&['Super Admin','Company Admin'].indexOf(emsRole())>=0;};
  const ent=function(){return typeof entitiesData!=='undefined'?entitiesData.find(function(x){return x.entityId===idEntity();}):null;};
  const store=function(tab){const e=ent();if(!e)return {};const p=csEntProfile[e.entityId]=csEntProfile[e.entityId]||{};const k=tab==='basic-details'?'basic':'bank';return p[k]=p[k]||{};};
  /* What the tab shows: the saved values over the prepared ones. */
  const eff=function(tab){const st=store(tab);return tab==='basic-details'&&prepared()?Object.assign({},PREPARED,st):st;};
  const esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
  /* The value a field shows now (the panel's own text), to fill the form. */
  const shown=function(root,label){
    const l=Array.prototype.find.call(root.querySelectorAll('.lp-sb-field-label'),function(x){return x.textContent.trim()===label;});
    const v=l&&l.nextElementSibling;const t=v?v.textContent.trim():'';return t==='-'?'':t;
  };
  window.csEditStart=function(){
    if(!canEdit()){if(typeof emsDeny==='function')emsDeny('edit company settings');return;}
    csEditTab=typeof csTab!=='undefined'?csTab:null;renderADTPage();
  };
  window.csEditCancel=function(){csEditTab=null;renderADTPage();};
  /* GSTIN is asked for only when the company is GST-registered. */
  window.csEditGstHook=function(){
    const i=FIELDS['basic-details'].indexOf(GST),g=document.getElementById('csed-gstin-g');
    if(g&&typeof getCSValue==='function')g.style.display=getCSValue('csed-'+i)==='Registered'?'':'none';
  };
  window.csEditSave=function(){
    const tab=csEditTab;if(!tab||!FIELDS[tab])return;
    const st=store(tab),changed=[],vals={};
    const was=eff(tab);
    FIELDS[tab].forEach(function(label,i){
      if(label===GST){if(document.getElementById('csw-csed-'+i)&&typeof getCSValue==='function'){const v=getCSValue('csed-'+i);vals[label]=GST_OPTS.indexOf(v)>=0?v:'';}return;}
      const el=document.getElementById('csed-'+i);if(el)vals[label]=UPPER[label]?el.value.trim().toUpperCase():el.value.trim();});
    if(tab==='basic-details'&&GST in vals){
      if(vals[GST]==='Registered'&&!vals['GSTIN']){showToast('GSTIN is required','error','Enter the GSTIN, or set GST Registration Status to Not Registered.');return;}
      if(vals[GST]!=='Registered')vals['GSTIN']='';
    }
    if(vals['Email']&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vals['Email'])){showToast('Check the email','error','"'+vals['Email']+'" is not an email address.');return;}
    if(tab==='basic-details'&&'Entity Name' in vals&&!vals['Entity Name']){showToast('Entity Name is required','error');return;}
    Object.keys(vals).forEach(function(label){if((was[label]||'')!==vals[label]){if(label in was||vals[label])changed.push(label);}if(st[label]!==vals[label]&&(label in st||(was[label]||'')!==vals[label]))st[label]=vals[label];});
    const e=ent();
    if(tab==='basic-details'&&e&&st['Entity Name'])e.storeName=st['Entity Name'];
    if(e&&changed.length){
      const s=stampNow();e.logs=e.logs||[];
      e.logs.unshift({date:s.date,time:s.time,user:idMeName(),userId:idMe(),status:'Active',action:(tab==='basic-details'?'Basic Details':'Banking Details')+' updated: '+changed.join(', ')+'.'});
    }
    csEditTab=null;if(typeof presSaveSoon==='function')presSaveSoon();renderADTPage();
    showToast('Saved','success',(tab==='basic-details'?'Basic Details':'Banking Details')+(changed.length?' updated: '+changed.join(', ')+'.':': nothing changed.'));
  };
  if(typeof renderCsSidebar==='function'){
    const r0=renderCsSidebar;
    renderCsSidebar=function(){
      const out=r0.apply(this,arguments),tab=typeof csTab!=='undefined'?csTab:'';
      if(!FIELDS[tab])return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      const st=eff(tab);
      /* The registration fields, together after Country. */
      if(tab==='basic-details'){
        const g0=tmp.querySelector('.lp-sb-detail-grid');
        const cell=function(label){const l=g0?Array.prototype.find.call(g0.querySelectorAll('.lp-sb-field-label'),function(x){return x.textContent.trim()===label;}):null;let n=l;while(n&&n.parentElement!==g0)n=n.parentElement;return n;};
        const model=cell('Entity ID');let after=cell('Country')||cell('Entity Type');
        if(g0&&model&&after&&!cell(REG[0]))REG.forEach(function(label){
          if(label==='GSTIN'&&st[GST]!=='Registered')return;
          const n=model.cloneNode(true),l=n.querySelector('.lp-sb-field-label'),v=l&&l.nextElementSibling;
          if(!l||!v)return;l.textContent=label;v.innerHTML='<span style="color:#9ca3af">-</span>';
          after.parentNode.insertBefore(n,after.nextSibling);after=n;
        });
      }
      /* The company's own values in place of the shared ones. */
      tmp.querySelectorAll('.lp-sb-field-label').forEach(function(l){
        const k=l.textContent.trim();if(!(k in st))return;
        const v=l.nextElementSibling;if(v)v.innerHTML=st[k]?esc(st[k]):'<span style="color:#9ca3af">-</span>';
      });
      const btns=tmp.querySelectorAll('.lp-sb-view-edit-btn');
      if(csEditTab===tab&&canEdit()){
        btns.forEach(function(b){b.remove();});
        const grid=tmp.querySelector('.lp-sb-detail-grid');
        if(grid){
          const f=FIELDS[tab].map(function(label,i){
            const val=label in st?st[label]:shown(grid,label);
            if(label===GST)return '<div class="ep-form-group"><label class="ep-form-label">'+esc(label)+'</label>'+apCS('csed-'+i,GST_OPTS,GST_OPTS.indexOf(val)>=0?val:'','Select','csEditGstHook')+'</div>';
            if(label==='GSTIN')return '<div class="ep-form-group" id="csed-gstin-g"'+(st[GST]==='Registered'?'':' style="display:none"')+'><label class="ep-form-label">GSTIN <span class="req">*</span></label>'
              +'<input class="ep-form-input" id="csed-'+i+'" maxlength="15" style="text-transform:uppercase" placeholder="'+HINT[label]+'" value="'+esc(val).replace(/"/g,'&quot;')+'"></div>';
            if(REG.indexOf(label)>=0)return '<div class="ep-form-group"><label class="ep-form-label">'+esc(label)+'</label>'
              +'<input class="ep-form-input" id="csed-'+i+'"'+(UPPER[label]?' style="text-transform:uppercase"':'')+' placeholder="'+HINT[label]+'" value="'+esc(val).replace(/"/g,'&quot;')+'"></div>';
            const inp=label==='Comments'||label==='Address'
              ?'<textarea class="ep-form-input" id="csed-'+i+'" rows="2">'+esc(val)+'</textarea>'
              :'<input class="ep-form-input" id="csed-'+i+'" value="'+esc(val).replace(/"/g,'&quot;')+'">';
            return '<div class="ep-form-group'+(WIDE[label]?' ep-form-full':'')+'"><label class="ep-form-label">'+esc(label==='Employee ID Pre fix'?'Employee ID Prefix':label)+'</label>'+inp+'</div>';
          }).join('');
          const holder=document.createElement('div');
          holder.innerHTML=axInlineFormHTML(f,'csEditCancel()','csEditSave()');
          grid.replaceWith(holder.firstChild);
        }
      }else{
        btns.forEach(function(b){if(canEdit())b.setAttribute('onclick','csEditStart()');else b.remove();});
      }
      return tmp.innerHTML;
    };
  }
  /* Leaving the tab or the page drops an unsaved edit. */
  if(typeof csSetTab==='function'){const s0=csSetTab;csSetTab=function(){csEditTab=null;return s0.apply(this,arguments);};}
  if(typeof navigatePage==='function'){const n0=navigatePage;navigatePage=function(){csEditTab=null;return n0.apply(this,arguments);};}
  /* Sign up on the sign-in page opens the company form. */
  window.addEventListener('load',function(){
    document.querySelectorAll('button.lg-link').forEach(function(b){if(/Sign up/.test(b.textContent)&&typeof lgSignUp==='function')b.setAttribute('onclick','lgSignUp()');});
  });
})();
