/* ══ ADD COMPANY: STORE FIELDS (product owner, 12 Nov 2026) ═════════════════════════════════════════════════════════
   Super Admin → Company Settings → + (Add Company) gets the store sign-up fields of the product owner's screen, without
   Store Type: Password and Re-Enter Password (they must match; nothing is kept - the presentation stores no
   passwords), Store Name (shown as the company's name in the Company Settings list), Store Category (Expense
   Management, shown in the list's Type column), and three acceptances, all optional: Terms & Conditions, MSA, and
   Consent and Authorization for FSSAI Registration. Presentation only; the standard application is unchanged. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const NC_STORE_CATS=['Expense Management'];
  const ACC=[['tc','I accept the Terms & Conditions'],['msa','I accept the MSA'],['fssai','I accept Consent and Authorization for FSSAI Registration']];
  if(typeof ncStart==='function'){
    const s0=ncStart;
    ncStart=function(){
      const out=s0.apply(this,arguments);
      if(nc){Object.assign(nc,{pass:'',pass2:'',storeName:'',storeCat:NC_STORE_CATS[0],acc:{tc:false,msa:false,fssai:false}});ncRender();}
      return out;
    };
  }
  if(typeof ncSync==='function'){
    const y0=ncSync;
    ncSync=function(){
      y0.apply(this,arguments);if(!nc)return;
      const v=function(id){const e=document.getElementById(id);return e?e.value:null;};
      let x;
      if((x=v('nc-pass'))!=null)nc.pass=x;if((x=v('nc-pass2'))!=null)nc.pass2=x;if((x=v('nc-store'))!=null)nc.storeName=x.trim();
      if(document.getElementById('csw-nc-storecat')){const c=getCSValue('nc-storecat');if(c)nc.storeCat=c;}
      nc.acc=nc.acc||{};ACC.forEach(function(a){const e=document.getElementById('nc-acc-'+a[0]);if(e)nc.acc[a[0]]=e.checked;});
    };
  }
  window.ncPassEye=function(id){const e=document.getElementById(id);if(e)e.type=e.type==='password'?'text':'password';};
  if(typeof ncHTML==='function'){
    const h0=ncHTML;
    ncHTML=function(){
      let out=h0.apply(this,arguments);if(!nc)return out;
      const pw=function(id,label,val){return '<div class="ep-form-group"><label class="ep-form-label">'+label+' <span class="req">*</span></label>'
        +'<div style="position:relative"><input class="ep-form-input" type="password" id="'+id+'" value="'+attrSafe(val||'')+'" placeholder="'+label+'" autocomplete="new-password" style="padding-right:56px">'
        +'<button type="button" class="att-link" style="position:absolute;right:10px;top:50%;transform:translateY(-50%)" onclick="ncPassEye(\''+id+'\')">Show</button></div></div>';};
      const add=pw('nc-pass','Password',nc.pass)+pw('nc-pass2','Re-Enter Password',nc.pass2)
        +'<div class="ep-form-group"><label class="ep-form-label">Store Name <span class="req">*</span></label><input class="ep-form-input" id="nc-store" value="'+attrSafe(nc.storeName||'')+'" placeholder="Store Name">'
          +'<div class="ea-hint">You can always change your store name in Settings.</div></div>'
        +'<div class="ep-form-group"><label class="ep-form-label">Store Category <span class="req">*</span></label>'+apCS('nc-storecat',NC_STORE_CATS,nc.storeCat||NC_STORE_CATS[0],'Select')
          +'<div class="ea-hint">The category that defines what the company uses the platform for.</div></div>';
      const at=out.indexOf('<div class="ep-form-group"><label class="ep-form-label">Entity Type');
      if(at>=0)out=out.slice(0,at)+add+out.slice(at);
      const checks='<div style="display:flex;flex-direction:column;gap:8px;margin:14px 0 4px">'+ACC.map(function(a){
        return '<label class="onc-decl" style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--gray);cursor:pointer"><input type="checkbox" id="nc-acc-'+a[0]+'"'+(nc.acc&&nc.acc[a[0]]?' checked':'')+'> '+sbEsc(a[1])+'</label>';}).join('')+'</div>';
      const f=out.indexOf('<div class="ct-modal-foot">');
      if(f>=0){const e=out.lastIndexOf('</div>',f);out=out.slice(0,f)+checks+out.slice(f);}
      return out.replace('class="ct-modal nc-modal"','class="ct-modal nc-modal" style="max-height:92vh;overflow-y:auto"');
    };
  }
  if(typeof ncSave==='function'){
    const v0=ncSave;
    ncSave=function(){
      if(!nc)return v0.apply(this,arguments);
      ncSync();
      const fail=function(m){nc.error=m;ncRender();};
      if(!nc.pass||!nc.pass2)return fail('Enter the password in both fields.');
      if(nc.pass.length<8)return fail('The password needs at least 8 characters.');
      if(nc.pass!==nc.pass2)return fail('The two passwords do not match.');
      if(!nc.storeName)return fail('Store Name is required.');
      if(NC_STORE_CATS.indexOf(nc.storeCat)<0)return fail('Pick the store category.');
      return v0.apply(this,arguments);
    };
  }
  /* Sign up on the sign-in page (product owner, 12 Nov 2026): the same form; Create makes the company and opens the
     platform as the OpenDhi Super Admin in Dhi Hyperlocal, whatever was entered. */
  window.lgSignUp=function(){
    nc={name:'',type:'EOR Entity',country:'India',tz:'Asia/Kolkata',cur:'INR',plan:'Enterprise',cards:true,budgets:true,error:'',
      pass:'',pass2:'',storeName:'',storeCat:NC_STORE_CATS[0],acc:{tc:false,msa:false,fssai:false},signup:true};
    ncRender();
  };
  if(typeof lgSoon==='function'){
    const l0=lgSoon;
    lgSoon=function(what){if(what==='Sign up'){lgSignUp();return;}return l0.apply(this,arguments);};
  }
  if(typeof ncHTML==='function'){
    const t0=ncHTML;
    ncHTML=function(){
      const out=t0.apply(this,arguments);
      return nc&&nc.signup?out.replace('<span class="ct-modal-title">Add Company</span>','<span class="ct-modal-title">Sign up</span>').replace('aria-label="Add Company"','aria-label="Sign up"'):out;
    };
  }
  if(typeof ncSave==='function'){
    const sv=ncSave;
    ncSave=function(){
      if(!nc||!nc.signup)return sv.apply(this,arguments);
      if(typeof idMe==='function'&&!idMe()){
        const em=typeof presStartEmail==='function'?presStartEmail():'';
        const r=typeof idSignIn==='function'?idSignIn(em):null;
        if(r&&r.error){nc.error=r.error;ncRender();return;}
      }
      /* The Super Admin's role, as signing in sets it, so the company may be created. */
      if(typeof currentRole!=='undefined')currentRole='';if(typeof emsSyncIdentity==='function')emsSyncIdentity();
      if(typeof emsClearCache==='function')emsClearCache();
      const before=entitiesData.length,name=(document.getElementById('nc-name')||{}).value||'';
      /* One message for sign up: the form's own 'Company created' is replaced by the one below. */
      const t0=window.showToast;window.showToast=function(a){if(a==='Company created')return;return t0.apply(this,arguments);};
      try{sv.apply(this,arguments);}finally{window.showToast=t0;}
      if(entitiesData.length===before)return;   // something to correct: the form stays open
      const made=entitiesData[entitiesData.length-1];
      const dh=entitiesData.find(function(e){return /Dhi Hyperlocal/i.test(e.name);})||entitiesData[0];
      if(dh){seSelectedEntity=dh.id;if(typeof appEntityChanged==='function')appEntityChanged();}
      if(typeof lgEnter==='function')lgEnter();
      showToast('Company created','success',(made.storeName||made.name||name)+' · '+made.entityId+' is ready. You are in Dhi Hyperlocal as the Super Admin.');
    };
  }
  /* The new company keeps its store name, category and acceptances (not the password). */
  if(typeof ncCreate==='function'){
    const c0=ncCreate;
    ncCreate=function(d){
      const r=c0.apply(this,arguments);
      if(r&&r.ent&&d){r.ent.storeName=d.storeName||'';r.ent.storeCategory=d.storeCat||'';r.ent.acceptances=Object.assign({},d.acc||{});}
      return r;
    };
  }
  /* The Company Settings list: Store Name as the entity, Store Category as its type. */
  if(typeof csEntityRows==='function'){
    const e0=csEntityRows;
    csEntityRows=function(){
      const rows=e0.apply(this,arguments),ent=typeof entitiesData!=='undefined'?entitiesData.find(function(x){return x.entityId===idEntity();}):null;
      if(!ent)return rows;
      return rows.map(function(r){if(r[2]!==ent.entityId)return r;const c=r.slice();if(ent.storeName)c[1]=ent.storeName;if(ent.storeCategory)c[3]=ent.storeCategory;return c;});
    };
  }
})();
