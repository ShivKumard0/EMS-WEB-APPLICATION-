/* ══ COMPANY SETTINGS: BASIC AND BANKING DETAILS ARE EDITABLE (product owner, 12 Nov 2026) ═══════════════════════════
   "on clicking Edit from Super Admin or Company Admin it shows 'fields are editable' but it does not allow to edit".
   The two Edit buttons were placeholders. Now, for the Super Admin and the Company Admin, Edit turns the tab's fields
   into a form (Cancel / Save changes) and the saved values are the company's own:
   - Basic Details: Entity Name (the name the company is listed by), Address, City, Employee ID Prefix;
   - Banking Details: Country / Location, Pay Name, Pay Bank, Account Number, IFSC, Swift, Currency, Email, Phone,
     VAT Number, Comments.
   Base Currency and Timezone keep their own Change. Every save is written to the company's Logs. In the presentation.
   Also: the sign-in page's "Sign up" opens the company form (js/nc-store-fields.js). */
let csEntProfile={};      // entityId → {basic:{label:value}, bank:{label:value}}
let csEditTab=null;       // the tab being edited ('basic-details' | 'banking-details')
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const FIELDS={
    'basic-details':['Entity Name','Address','City','Employee ID Pre fix'],
    'banking-details':['Country / Location','Pay Name','Pay Bank','Account Number','IFSC Code','Swift Code','Currency','Email','Phone Number','VAT Number','Comments']
  };
  const WIDE={'Address':1,'Comments':1};
  const canEdit=function(){return typeof emsRole==='function'&&['Super Admin','Company Admin'].indexOf(emsRole())>=0;};
  const ent=function(){return typeof entitiesData!=='undefined'?entitiesData.find(function(x){return x.entityId===idEntity();}):null;};
  const store=function(tab){const e=ent();if(!e)return {};const p=csEntProfile[e.entityId]=csEntProfile[e.entityId]||{};const k=tab==='basic-details'?'basic':'bank';return p[k]=p[k]||{};};
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
  window.csEditSave=function(){
    const tab=csEditTab;if(!tab||!FIELDS[tab])return;
    const st=store(tab),changed=[],vals={};
    FIELDS[tab].forEach(function(label,i){const el=document.getElementById('csed-'+i);if(el)vals[label]=el.value.trim();});
    if(vals['Email']&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vals['Email'])){showToast('Check the email','error','"'+vals['Email']+'" is not an email address.');return;}
    if(tab==='basic-details'&&'Entity Name' in vals&&!vals['Entity Name']){showToast('Entity Name is required','error');return;}
    Object.keys(vals).forEach(function(label){if(st[label]!==vals[label]){if(label in st||vals[label])changed.push(label);st[label]=vals[label];}});
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
      const st=store(tab);
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
