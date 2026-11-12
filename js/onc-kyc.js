/* ══ KYC TAB: AADHAAR AND DOCUMENTS (product owner, 12 Nov 2026) ════════════════════════════════════════════════════
   "in employee profile instead of ONC Card rename it to KYC, and in details ask Aadhaar number as well, and also ask to
   attach the Aadhaar and PAN card document". In the presentation:
   - the ONC Card tab reads KYC (My Profile and the employee's panel), and so does every mention of it;
   - KYC asks the Aadhaar Number (12 digits, shown masked as XXXX XXXX 1234 outside the edit form) after the PAN;
   - a Documents section asks the Aadhaar Card and PAN Card documents (PDF, JPG or PNG, up to 5 MB each).
   All three are required by default and follow the same flow as the other details: the employee fills them in, HR
   reviews, and the card is ready only when they are complete. Card Setup → Card Enrollment can make them optional or
   hide them, like any other field. The file's name is kept with the record. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof ONC_REGISTRY==='undefined')return;
  const DOC_RULE='PDF, JPG or PNG, up to 5 MB';
  const NEW=[
    {k:'aadhaar',label:'Aadhaar Number',group:'KYC',src:'onc',owner:'employee',type:'text',defMandatory:true,rule:'12 digits'},
    {k:'docAadhaar',label:'Aadhaar Card Document',group:'Documents',src:'onc',owner:'employee',type:'file',defMandatory:true,rule:DOC_RULE},
    {k:'docPan',label:'PAN Card Document',group:'Documents',src:'onc',owner:'employee',type:'file',defMandatory:true,rule:DOC_RULE}];
  if(!ONC_REGISTRY.some(function(f){return f.k==='aadhaar';})){
    const at=ONC_REGISTRY.findIndex(function(f){return f.k==='pan';});
    Array.prototype.splice.apply(ONC_REGISTRY,[at<0?ONC_REGISTRY.length:at+1,0].concat(NEW));
  }
  if(typeof ONC_GROUPS!=='undefined'&&ONC_GROUPS.indexOf('Documents')<0)ONC_GROUPS.splice(ONC_GROUPS.indexOf('KYC')+1,0,'Documents');
  /* Companies set up before these fields existed get them too: shown and required. */
  if(typeof oncCfgOf==='function'){
    const c0=oncCfgOf;
    oncCfgOf=function(){const c=c0.apply(this,arguments);if(c)NEW.forEach(function(f){if(!c[f.k])c[f.k]={show:true,mandatory:true};});return c;};
  }
  const digits=function(v){return String(v||'').replace(/\s+/g,'');};
  const maskAadhaar=function(v){const d=digits(v);return d.length>=4?'XXXX XXXX '+d.slice(-4):v;};
  if(typeof oncCheckField==='function'){
    const k0=oncCheckField;
    oncCheckField=function(f,v,mandatory){
      if(f&&f.k==='aadhaar'){
        const s=digits(v);if(!s)return mandatory?f.label+' is required':'';
        if(!/^[2-9][0-9]{11}$/.test(s))return 'Aadhaar Number must be 12 digits';
        return '';
      }
      return k0.apply(this,arguments);
    };
  }
  /* The upload control: the file's name is the field's value (a hidden input the form already reads). */
  if(typeof oncFieldHTML==='function'){
    const h0=oncFieldHTML;
    oncFieldHTML=function(f,v){
      if(!f||f.type!=='file')return h0.apply(this,arguments);
      const id='onc-e-'+f.k,req=oncMandatory(f);
      return '<div class="ep-form-group"><label class="ep-form-label">'+f.label+(req?' <span class="req">*</span>':'')+'</label>'
        +'<input type="hidden" id="'+id+'" value="'+attrSafe(v||'')+'">'
        +'<div style="display:flex;align-items:center;gap:10px;min-height:38px">'
          +'<button type="button" class="btn btn-outline btn-sm" onclick="oncKycPick(\''+f.k+'\')">'+(v?'Replace':'Upload')+'</button>'
          +'<span id="'+id+'-name" class="wb-muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(v?sbEsc(v):'No file attached')+'</span></div>'
        +'<div class="ea-hint">'+DOC_RULE+'</div></div>';
    };
  }
  window.oncKycPick=function(k){
    const inp=document.createElement('input');inp.type='file';inp.accept='.pdf,.jpg,.jpeg,.png';
    inp.addEventListener('change',function(){
      const file=inp.files&&inp.files[0];if(!file)return;
      if(!/\.(pdf|jpe?g|png)$/i.test(file.name)){showToast('File type not accepted','error','Attach a PDF, JPG or PNG.');return;}
      if(file.size>5*1024*1024){showToast('File too large','error','"'+file.name+'" is over 5 MB.');return;}
      const el=document.getElementById('onc-e-'+k);if(el)el.value=file.name;
      const nm=document.getElementById('onc-e-'+k+'-name');if(nm)nm.textContent=file.name;
      const b=nm&&nm.previousElementSibling;if(b)b.textContent='Replace';
      if(typeof oncEdit!=='undefined'&&oncEdit&&oncEdit.draft)oncEdit.draft[k]=file.name;
    });
    inp.click();
  };
  /* The tab: KYC; the Aadhaar Number masked outside the edit form. */
  if(typeof oncTabHTML==='function'){
    const t0=oncTabHTML;
    oncTabHTML=function(){
      const out=t0.apply(this,arguments).replace('ONC Card Enrollment · ','KYC · ');
      if(out.indexOf('Aadhaar')<0)return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      tmp.querySelectorAll('.lp-sb-field-label').forEach(function(l){
        if(!/^Aadhaar Number/.test(l.textContent.trim()))return;
        const v=l.nextElementSibling,t=v&&v.firstChild;
        if(t&&t.nodeType===3&&/\d{4}/.test(t.nodeValue))t.nodeValue=maskAadhaar(t.nodeValue);
      });
      tmp.querySelectorAll('.onc-pend tr').forEach(function(tr){
        const c=tr.children[0];if(!c||!/^Aadhaar Number/.test(c.textContent.trim()))return;
        const w=document.createTreeWalker(tr.children[1]||tr,NodeFilter.SHOW_TEXT,null);let n;
        while((n=w.nextNode()))n.nodeValue=n.nodeValue.replace(/\b[2-9]\d{3}\s?\d{4}\s?(\d{4})\b/g,'XXXX XXXX $1');
      });
      return tmp.innerHTML;
    };
  }
  if(typeof deExtraTabs==='function'){
    const d0=deExtraTabs;
    deExtraTabs=function(){return d0.apply(this,arguments).map(function(t){return t.id==='onc-card'?Object.assign({},t,{label:'KYC'}):t;});};
  }
  if(typeof buildMyProfileHTML==='function'){
    const p0=buildMyProfileHTML;
    buildMyProfileHTML=function(){return p0.apply(this,arguments).replace(/(data-tab="onc-card"[^>]*>)ONC Card</,'$1KYC<');};
  }
  /* Every other mention on screen: notes, hints, messages. */
  const RX=[[/ONC Card Enrollment/g,'KYC'],[/\bthe ONC Card tab\b/g,'the KYC tab'],[/\bONC Card tab\b/g,'KYC tab'],[/→ ONC Card\b/g,'→ KYC']];
  const SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,NOSCRIPT:1};
  const fix=function(t){const p=t.parentNode;if(!p||SKIP[p.nodeName])return;let s=t.nodeValue;if(s.indexOf('ONC Card')<0)return;
    RX.forEach(function(r){s=s.replace(r[0],r[1]);});if(s.trim()==='ONC Card')s=s.replace('ONC Card','KYC');if(s!==t.nodeValue)t.nodeValue=s;};
  const scan=function(root){
    if(!root)return;if(root.nodeType===3){fix(root);return;}
    if(root.nodeType!==1||SKIP[root.nodeName]||(root.textContent||'').indexOf('ONC Card')<0)return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);let n;while((n=w.nextNode()))fix(n);
  };
  const start=function(){scan(document.body);new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='characterData')fix(m.target);else m.addedNodes.forEach(scan);});})
    .observe(document.body,{childList:true,subtree:true,characterData:true});};
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
  if(typeof window.showToast==='function'){
    const s0=window.showToast;
    window.showToast=function(a,b,c){const f=function(x){if(typeof x!=='string'||x.indexOf('ONC Card')<0)return x;RX.forEach(function(r){x=x.replace(r[0],r[1]);});return x;};return s0.call(this,f(a),b,f(c));};
  }
})();
