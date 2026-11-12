/* ══ 12 NOV 2026 (product owner), PRESENTATION ═══════════════════════════════════════════════════════════════════════
   1. Company Settings → Attachments: an uploaded document can be replaced as well as removed (Basic Details and Banking
      Details already have Edit; the drop zone uploads). Company Admin and Super Admin.
   2. "remove shaun name from everywhere, instead keep shiv": the OpenDhi Super Admin reads "Shiv" and their email
      rahul@gmail.com on every screen. Accounts and records keep their ids, so sign-in and Switch Role work as before. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;

  /* 1 · Replace an uploaded attachment */
  const REPL_ICO='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/></svg>';
  window.csAttReplace=function(i){
    const rec=typeof attachRec==='function'?attachRec('cs','entity'):null;if(!rec||!rec.attachments[i])return;
    const inp=document.createElement('input');inp.type='file';
    inp.addEventListener('change',function(){
      const f=inp.files&&inp.files[0];if(!f)return;
      if(f.size>10*1024*1024){showToast('File too large','error','"'+sbEsc(f.name)+'" is over the 10 MB limit.');return;}
      const old=rec.attachments[i],s=stampNow();
      rec.attachments[i]=Object.assign({},old,{name:f.name,size:attachFmtSize(f.size),type:attachKind(f.name),by:typeof CURRENT_USER!=='undefined'?CURRENT_USER:idMeName(),source:'Replaced',date:s.date});
      renderADTPage();
      showToast('Attachment replaced','success','"'+sbEsc(old.name)+'" was replaced by "'+sbEsc(f.name)+'".');
    });
    inp.click();
  };
  if(typeof csAttachmentsTabHTML==='function'){
    const a0=csAttachmentsTabHTML;
    csAttachmentsTabHTML=function(){
      return a0.apply(this,arguments).replace(/<button class="att-row-btn is-danger" title="Remove" onclick="attachRemove\('cs','entity',(\d+)\)">/g,function(m,i){
        return '<button class="att-row-btn" title="Replace" onclick="csAttReplace('+i+')">'+REPL_ICO+'</button>'+m;});
    };
  }

  /* 2 · Shaun → Shiv, rahul@gmail.com */
  const NAME='Shiv',MAIL='rahul@gmail.com';
  const renameData=function(){
    const nm=function(o,k){if(o&&typeof o[k]==='string'&&/^Shaun\b/.test(o[k]))o[k]=NAME;};
    (typeof idUsers!=='undefined'?idUsers:[]).forEach(function(u){nm(u,'name');});
    (typeof directEmpData!=='undefined'?directEmpData:[]).forEach(function(e){nm(e,'name');});
    (typeof globalEmpData!=='undefined'?globalEmpData:[]).forEach(function(e){nm(e,'name');});
    (typeof csRoles!=='undefined'?csRoles:[]).forEach(function(r){nm(r,'user');});
  };
  window.addEventListener('load',function(){
    if(typeof PRES_READY!=='undefined'&&PRES_READY&&PRES_READY.then)PRES_READY.then(function(){renameData();if(typeof renderADTPage==='function')renderADTPage();});
  });
  const RX=[[/\bShaun (Mathew|Varghese)\b/g,NAME],[/\bShaun\b/g,NAME],[/\bshaun(\.(mathew|varghese))?@(opendhi\.com|testemp\.com)\b/gi,MAIL]];
  const SKIP={SCRIPT:1,STYLE:1,NOSCRIPT:1};
  const fix=function(t){const p=t.parentNode;if(!p||SKIP[p.nodeName])return;let s=t.nodeValue;if(!/shaun/i.test(s))return;RX.forEach(function(r){s=s.replace(r[0],r[1]);});if(s!==t.nodeValue)t.nodeValue=s;};
  const fixInputs=function(root){(root.querySelectorAll?root.querySelectorAll('input,textarea'):[]).forEach(function(el){if(el.value&&/shaun/i.test(el.value)){let v=el.value;RX.forEach(function(r){v=v.replace(r[0],r[1]);});el.value=v;}});};
  const scan=function(root){
    if(!root)return;
    if(root.nodeType===3){fix(root);return;}
    if(root.nodeType!==1||SKIP[root.nodeName])return;
    if(/shaun/i.test(root.textContent||'')){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);let n;while((n=w.nextNode()))fix(n);}
    fixInputs(root);
    if(root.getAttribute&&root.getAttribute('title')&&/shaun/i.test(root.getAttribute('title'))){let v=root.getAttribute('title');RX.forEach(function(r){v=v.replace(r[0],r[1]);});root.setAttribute('title',v);}
  };
  const start=function(){
    scan(document.body);
    new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='characterData')fix(m.target);else m.addedNodes.forEach(scan);});})
      .observe(document.body,{childList:true,subtree:true,characterData:true});
  };
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
  /* Toasts are written before they reach the page. */
  const t0=window.showToast;
  if(typeof t0==='function')window.showToast=function(a,b,c){const f=function(x){if(typeof x!=='string')return x;RX.forEach(function(r){x=x.replace(r[0],r[1]);});return x;};return t0.call(this,f(a),b,f(c));};
})();
