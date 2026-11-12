/* ══ NO IMPREST IN THE PRESENTATION (product owner, 12 Nov 2026) ═════════════════════════════════════════════════
   "imprest remove it completely, we are not any more using any of it". In the presentation (index.html?env=presentation)
   imprest is gone from every screen, in Nova Retail and in the platform company alike:
   - Expenses & Advances: no Imprest Funds in Manage, no Imprest Request rows, type or + option; Advance Settings
     (not "Advance & Imprest Settings") lists no Imprest routes; an advance type is One-Time only;
   - RBAC: no Imprest Custodian template, no Imprest permission area, no Imprest Custodians team in any workspace;
   - Policies: no Petty Cash / Imprest category (js/ems-policies.js);
   - leftover wording in descriptions reads without it ("recoveries and reports", "Advance Settings").
   The normal application and its regression suites are unchanged: the code and records stay underneath. */
(function(){
  if(!/[?&]env=presentation\b/.test(location.search))return;
  const IMP=/imprest|petty cash/i;
  const wrap=function(name,fn){const f=window[name];if(typeof f==='function')window[name]=fn(f);};
  const without=function(list,key){return (list||[]).filter(function(x){return !IMP.test(key?x[key]:x);});};

  /* Expenses & Advances */
  wrap('advPageTabs',function(f){return function(){return f.apply(this,arguments).filter(function(t){return t.id!=='imprest';});};});
  wrap('eaActions',function(f){return function(){return f.apply(this,arguments).filter(function(a){return !IMP.test(a[0]);});};});
  wrap('eaNewOptions',function(f){return function(){return f.apply(this,arguments).filter(function(o){return o[0]!=='imp'&&!IMP.test(o[1]);});};});
  wrap('eaRows',function(f){return function(){return f.apply(this,arguments).filter(function(x){return x.kind!=='irq'&&x.kind!=='fund'&&!IMP.test(x.type||'');});};});
  if(typeof EA_TYPES!=='undefined'){const i=EA_TYPES.indexOf('Imprest Request');if(i>=0)EA_TYPES.splice(i,1);}
  wrap('advTypesHere',function(f){return function(){return f.apply(this,arguments).filter(function(t){return t.model!=='Imprest'&&!IMP.test(t.name);});};});
  wrap('advTypeFormHTML',function(f){return function(){
    return f.apply(this,arguments).replace(/<div class="cs-option[^"]*"[^>]*>\s*<span>Imprest<\/span>[\s\S]*?<\/div>/g,'');};});
  /* Approval routes: the Imprest kind is not listed or offered. */
  const noImpKinds=function(f){return function(){
    if(typeof awfKinds==='undefined'||awfKinds.indexOf('Imprest')<0)return f.apply(this,arguments);
    const k=awfKinds;awfKinds=k.filter(function(x){return x!=='Imprest';});
    try{return f.apply(this,arguments);}finally{awfKinds=k;}
  };};
  ['awfRows','awfListHTML','awfModalHTML','awfStartAdd'].forEach(function(n){wrap(n,noImpKinds);});

  /* RBAC */
  if(typeof RB_CATALOGUE!=='undefined')Object.keys(RB_CATALOGUE).forEach(function(k){
    if(Array.isArray(RB_CATALOGUE[k]))RB_CATALOGUE[k]=RB_CATALOGUE[k].filter(function(a){return !IMP.test(a.area);});
  });
  wrap('rbRows',function(f){return function(){return without(f.apply(this,arguments),'name');};});
  wrap('wsActiveTemplates',function(f){return function(){return without(f.apply(this,arguments),'name');};});
  const dropTeams=function(){
    (typeof rbacWorkspacesData!=='undefined'?rbacWorkspacesData:[]).forEach(function(w){
      if((w.teams||[]).some(function(t){return IMP.test(t.name);}))w.teams=w.teams.filter(function(t){return !IMP.test(t.name);});
    });
  };
  dropTeams();
  window.addEventListener('load',function(){if(typeof PRES_READY!=='undefined'&&PRES_READY&&PRES_READY.then)PRES_READY.then(dropTeams);});

  /* Wording left in descriptions and headings. */
  const PHRASES=[
    [/Advance &(amp;)? Imprest Settings/g,'Advance Settings'],
    [/Advances &(amp;)? Imprest/g,'Advances'],
    [/\s+and assigned imprest funds/gi,''],
    [/,\s*imprest funds(?=\s+and\b)/gi,''],
    [/,\s*imprest funds\b/gi,''],
    [/\badvance\/imprest\b/gi,'advance'],
    [/\bAdvance\/Imprest\b/g,'Advance'],
    [/\s*\(advances?(,| and) imprest[^)]*\)/gi,'']
  ];
  const SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,NOSCRIPT:1};
  function fix(t){
    const p=t.parentNode;if(!p||SKIP[p.nodeName])return;
    let s=t.nodeValue;if(!IMP.test(s))return;
    PHRASES.forEach(function(r){s=s.replace(r[0],r[1]);});
    if(s!==t.nodeValue)t.nodeValue=s;
  }
  function scan(root){
    if(!root)return;
    if(root.nodeType===3){fix(root);return;}
    if(root.nodeType!==1||SKIP[root.nodeName]||!IMP.test(root.textContent||''))return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);let n;
    while((n=w.nextNode()))fix(n);
  }
  const start=function(){
    scan(document.body);
    new MutationObserver(function(ms){ms.forEach(function(m){
      if(m.type==='characterData')fix(m.target);else m.addedNodes.forEach(scan);
    });}).observe(document.body,{childList:true,subtree:true,characterData:true});
  };
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
