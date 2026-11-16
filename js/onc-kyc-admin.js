/* KYC filled in by the Company Admin: the declarations can be ticked there (product owner, 16 Nov 2026).
   "For the existing employees and all newly created employees, in the Company Admin, while filling KYC details ...
   make the declaration checkboxes working; after checking, allow the Save changes option."
   - When someone other than the employee edits an employee's KYC (Company Admin, Super Admin, HR), the three
     declarations are part of the edit form as working checkboxes. Save changes stays off until all three are ticked.
   - Saving records the declarations as accepted, with who ticked them and for whom, and a line in the log.
   - The employee's own tab is unchanged: they still accept their declarations themselves.
   The Aadhaar Number takes any 12 digits (js/onc-kyc.js). Nothing else about KYC, cards or approvals changes. */
(function(){
  if(typeof oncTabHTML!=='function'||typeof oncSaveEdit!=='function'||typeof oncRec!=='function')return;
  const KEYS=['declConsent','declPep','declTrue'];
  const self=function(emp){return typeof oncIsSelf==='function'&&oncIsSelf(emp);};
  const editing=function(emp){return typeof oncEdit!=='undefined'&&oncEdit&&emp&&oncEdit.eid===emp.eid&&!self(emp);};
  const ticks=function(){
    if(!oncEdit.adDecl){const r=oncRec(oncEdit.eid),done=typeof oncDeclsDone==='function'&&oncDeclsDone(r);oncEdit.adDecl={};KEYS.forEach(function(k){oncEdit.adDecl[k]=!!done;});}
    return oncEdit.adDecl;
  };
  const all=function(){const t=ticks();return KEYS.every(function(k){return t[k];});};

  const t0=oncTabHTML;
  oncTabHTML=function(emp){
    const out=t0.apply(this,arguments);
    if(self(emp))return out;
    const tmp=document.createElement('div');tmp.innerHTML=out;
    const head=Array.prototype.find.call(tmp.querySelectorAll('.onc-group-h'),function(h){return /^Declarations and consent/.test(h.textContent.trim());});
    if(!head)return out;
    const box=head.nextElementSibling&&head.nextElementSibling.classList.contains('onc-decls')?head.nextElementSibling:null;
    const sub=head.querySelector('.wb-muted');if(sub)sub.remove();
    if(!editing(emp)){
      /* not accepted yet: say where they are ticked */
      if(box)box.querySelectorAll('.wb-note').forEach(function(n){if(/Awaiting the employee/.test(n.textContent))n.textContent='Not accepted yet. Open Edit to tick the declarations.';});
      return tmp.innerHTML;
    }
    const acts=tmp.querySelector('.lp-sb-edit-form .lp-sb-form-actions');
    if(!acts)return out;
    const t=ticks(),prov=typeof oncProviderName==='function'?oncProviderName():'the card provider';
    const fs=(typeof oncFields==='function'?oncFields():[]).filter(function(f){return f.type==='decl'&&(typeof oncShown!=='function'||oncShown(f));});
    const wrap=document.createElement('div');
    wrap.innerHTML='<div class="onc-group-h">Declarations and consent</div><div class="onc-decls">'
      +fs.map(function(f){return '<label class="onc-decl" style="cursor:pointer"><input type="checkbox" id="onc-ad-'+f.k+'"'+(t[f.k]?' checked':'')+' onchange="oncAdDecl(\''+f.k+'\',this.checked)"><span>'
        +(typeof sbEsc==='function'?sbEsc(f.label.replace('the card provider',prov)):f.label)+'</span></label>';}).join('')+'</div>';
    while(wrap.firstChild)acts.parentNode.insertBefore(wrap.firstChild,acts);
    head.remove();if(box)box.remove();
    const save=acts.querySelector('.ep-save-btn');
    if(save){save.id='onc-ad-save';if(!all()){save.setAttribute('disabled','');save.style.opacity='.5';save.style.cursor='not-allowed';save.title='Tick the three declarations to save';}}
    return tmp.innerHTML;
  };
  window.oncAdDecl=function(k,on){
    if(typeof oncEdit==='undefined'||!oncEdit)return;
    ticks()[k]=!!on;
    const b=document.getElementById('onc-ad-save');if(!b)return;
    if(all()){b.removeAttribute('disabled');b.style.opacity='';b.style.cursor='';b.title='';}
    else{b.setAttribute('disabled','');b.style.opacity='.5';b.style.cursor='not-allowed';b.title='Tick the three declarations to save';}
  };
  const s0=oncSaveEdit;
  oncSaveEdit=function(){
    if(typeof oncEdit==='undefined'||!oncEdit)return s0.apply(this,arguments);
    const eid=oncEdit.eid,emp=typeof oncEmpOf==='function'?oncEmpOf(eid):null;
    if(!emp||self(emp))return s0.apply(this,arguments);
    if(!all()){showToast('Tick the three declarations','error','Save changes is available once all three are ticked.');return;}
    const res=s0.apply(this,arguments);
    if(typeof oncEdit!=='undefined'&&oncEdit)return res;          // not saved (a detail was not accepted): nothing recorded
    try{
      const r=oncRec(eid,true);
      if(!(typeof oncDeclsDone==='function'&&oncDeclsDone(r))){
        const s=typeof stampNow==='function'?stampNow():{date:'',time:''},who=typeof idMeName==='function'?idMeName():'';
        r.decls={declConsent:true,declPep:true,declTrue:true,acceptedBy:who+' for '+emp.name,acceptedById:typeof idMe==='function'?idMe():'',acceptedAt:s.date+' | '+s.time,
          provider:typeof oncProviderName==='function'?oncProviderName():'',version:typeof ONC_DECL_VERSION!=='undefined'?ONC_DECL_VERSION:'',onBehalf:true};
        if(r.logs&&typeof oncLog==='function')r.logs.unshift(oncLog(oncStatus(emp,r),'Declarations and consent ticked by '+who+' for '+emp.name+'.'));
        if(typeof oncRefresh==='function')oncRefresh(eid);
        if(typeof presSaveSoon==='function')presSaveSoon();
      }
    }catch(e){}
    return res;
  };
})();
