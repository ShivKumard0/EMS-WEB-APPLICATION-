/* ══ MODULE CONTROL AS MODULE CARDS (product owner, 12 Nov 2026) ════════════════════════════════════════════════════
   Company Settings → Module Control in a client company (Nova Retail), for the Super Admin only (not the Company
   Admin), drawn like the product owner's reference: "Module Control" with the modules enabled and an Unsaved changes
   badge; Always Enabled (Dashboard, My Profile); then Modules - the platform's own menu (Dhi Hyperlocal's, without
   Funding & Budgets) - each a card with its section, its switch and, when on, its sub-modules to tick. Changes are kept
   with Save changes (Discard drops them). Everything starts selected.
   For showing only (product owner): the choices are kept with the company and change nothing else - menus, rights and
   the company's real module settings are untouched. The client-menu setting below it is unchanged. In the presentation. */
let mcShowBook={};   // entityId → {v:2, mods:{key:true|false}, subs:{key:{sub:true|false}}}
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const ALWAYS=[{label:'Dashboard',sub:'Overview'},{label:'My Profile',sub:'User menu'}];
  const MODS=[
    {key:'people',label:'People',section:'Workforce',subs:['Employees','Teams']},
    {key:'contracts',label:'Contracts',section:'Workforce',subs:['Overview','Templates']},
    {key:'hr-docs',label:'HR Docs',section:'Workforce',subs:[]},
    {key:'time',label:'Time & Attendance',section:'Time & Pay',subs:['Timesheets','Leave Requests','Leave Policies','Holidays']},
    {key:'payroll',label:'Payroll Management',section:'Time & Pay',subs:['Payroll','Payheads']},
    {key:'expenses',label:'Expense Management',section:'Expenses',subs:['Expenses & Advances','Transactions','Capping Limit','Policies','Wallet & Benefits']},
    {key:'cards',label:'Corporate Cards',section:'Expenses',subs:['Cards','Requests & Loads','Statements & Reconciliation','Card Setup']},
    {key:'finance',label:'Finance',section:'Expenses',subs:['Payments']},
    {key:'compliance',label:'Compliance Hub',section:'Governance',subs:['Compliance Item','Rates & Rules']},
    {key:'admin',label:'Administration',section:'Governance',subs:['Company Settings','Company Structure','Users']},
    {key:'admin-access',label:'Admin Access',section:'Governance',subs:['Assets','IT Accesses']},
    {key:'rbac',label:'RBAC',section:'Governance',subs:['Workspaces','Templates']},
    {key:'announcements',label:'Announcements',section:'Governance',subs:[]},
    {key:'chats',label:'Chats',section:'Support',subs:[]},
    {key:'tickets',label:'Tickets',section:'Support',subs:[]}
  ];
  const LOCK='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const SHIELD='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  /* The look of the reference, for this screen only. */
  (function(){
    if(document.getElementById('mcs-style'))return;
    const st=document.createElement('style');st.id='mcs-style';
    st.textContent='.mcs-card{border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:12px 14px;margin-bottom:8px;background:#fff}'
      +'.mcs-card.is-always{background:#f8fafc}'
      +'.mcs-row{display:flex;align-items:center;gap:12px}.mcs-txt{flex:1;min-width:0}'
      +'.mcs-name{font-size:13.5px;font-weight:600;color:var(--navy,#0f172a);display:flex;align-items:center;gap:8px}'
      +'.mcs-sub{font-size:12px;color:var(--gray,#6a7282);margin-top:2px}'
      +'.mcs-lock{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;color:#334155;background:#eef2f7;border-radius:6px;padding:1px 7px}'
      +'.mcs .cs-toggle input:checked+.cs-toggle-slider{background:#1a1a1a}'
      +'.mcs .is-always .cs-toggle input:checked+.cs-toggle-slider{background:#6b7280}'
      +'.mcs .is-always .cs-toggle{cursor:default}'
      +'.mcs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}'
      +'.mcs-opt{display:flex;align-items:center;gap:8px;border:1px solid var(--border,#e5e7eb);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--navy,#0f172a);cursor:pointer;min-width:0;background:#fff}'
      +'.mcs-opt input{accent-color:#1a1a1a;width:15px;height:15px;margin:0;flex:none}'
      +'.mcs-opt span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'.mcs-h{font-size:13px;font-weight:700;color:var(--navy,#0f172a);margin:16px 0 8px}'
      +'.mcs-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500;color:#334155;border:1px solid var(--border,#e5e7eb);background:#f8fafc;border-radius:999px;padding:3px 10px}';
    (document.head||document.documentElement).appendChild(st);
  })();
  const mod=function(k){return MODS.find(function(m){return m.key===k;});};
  const fresh=function(){const b={v:2,mods:{},subs:{}};MODS.forEach(function(m){b.mods[m.key]=true;b.subs[m.key]={};m.subs.forEach(function(x){b.subs[m.key][x]=true;});});return b;};
  const saved=function(){const ent=idEntity();let b=mcShowBook[ent];if(!b||b.v!==2)b=mcShowBook[ent]=fresh();return b;};
  let draft=null,draftEnt='';   // the changes not yet saved
  const cur=function(){if(draft&&draftEnt===idEntity())return draft;return saved();};
  const edit=function(){if(!draft||draftEnt!==idEntity()){draft=JSON.parse(JSON.stringify(saved()));draftEnt=idEntity();}return draft;};
  const dirty=function(){return !!draft&&draftEnt===idEntity()&&JSON.stringify(draft)!==JSON.stringify(saved());};
  const can=function(){return typeof emsRole==='function'&&emsRole()==='Super Admin';};   // the Super Admin's only (product owner, 12 Nov 2026)
  const esc=function(s){return typeof sbEsc==='function'?sbEsc(s):String(s);};
  const enabled=function(){const b=cur();return MODS.filter(function(m){return b.mods[m.key];}).length;};
  const subLine=function(m){const b=cur(),on=b.mods[m.key];if(!m.subs.length)return m.section;
    const n=m.subs.filter(function(x){return b.subs[m.key][x];}).length;
    return m.section+' · '+(on?n+' of '+m.subs.length+' sub-modules selected':m.subs.length+' sub-module'+(m.subs.length>1?'s':''));};
  const tog=function(on,attrs){return '<label class="cs-toggle"><input type="checkbox"'+(on?' checked':'')+attrs+'><span class="cs-toggle-slider"></span></label>';};
  function cardHTML(m){
    const b=cur(),on=!!b.mods[m.key];
    return '<div class="mcs-card" id="mcs-'+m.key+'"><div class="mcs-row"><div class="mcs-txt"><div class="mcs-name">'+esc(m.label)+'</div>'
        +'<div class="mcs-sub mcs-count">'+esc(subLine(m))+'</div></div>'+tog(on,' onchange="mcsToggle(\''+m.key+'\',this.checked)"')+'</div>'
      +(on&&m.subs.length?'<div class="mcs-grid">'+m.subs.map(function(x,i){
        return '<label class="mcs-opt"><input type="checkbox"'+(b.subs[m.key][x]?' checked':'')+' onchange="mcsSub(\''+m.key+'\','+i+',this.checked)"><span>'+esc(x)+'</span></label>';}).join('')+'</div>':'')
      +'</div>';
  }
  function headHTML(){
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span class="lp-sb-section-title">Module Control</span>'
        +'<span id="mcs-unsaved"'+(dirty()?'':' style="display:none"')+'>'+(typeof axBadge==='function'?axBadge('wait','Unsaved changes'):'Unsaved changes')+'</span></div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px"><span class="mcs-pill">'+SHIELD+' Opendhi internal only</span>'
        +'<span id="mcs-total" style="font-size:12px;color:var(--gray,#6a7282)">'+enabled()+' of '+MODS.length+' modules enabled</span></div>'
      +'<div style="font-size:11.5px;color:var(--gray,#6a7282);margin-top:6px">The modules and sub-modules this entity uses. Only OpenDhi changes them.</div>';
  }
  function actionsHTML(){
    return '<div id="mcs-actions" class="lp-sb-form-actions"'+(dirty()?'':' style="display:none"')+'><button class="ep-cancel-btn" onclick="mcsDiscard()">Discard</button><button class="ep-save-btn" onclick="mcsSave()">Save changes</button></div>';
  }
  function viewHTML(){
    return '<div class="mcs">'+headHTML()
      +'<div class="mcs-h">Always Enabled</div>'
      +ALWAYS.map(function(a){return '<div class="mcs-card is-always"><div class="mcs-row"><div class="mcs-txt"><div class="mcs-name">'+esc(a.label)+'<span class="mcs-lock">'+LOCK+' Always enabled</span></div>'
        +'<div class="mcs-sub">'+esc(a.sub)+'</div></div>'+tog(true,' disabled')+'</div></div>';}).join('')
      +'<div class="mcs-h">Modules</div>'+MODS.map(cardHTML).join('')
      +actionsHTML()+'</div>'
      +(typeof mcClientMenuHTML==='function'?mcClientMenuHTML():'');
  }
  const after=function(k){
    const m=k&&mod(k),el=k&&document.getElementById('mcs-'+k);if(el&&m)el.outerHTML=cardHTML(m);
    const t=document.getElementById('mcs-total');if(t)t.textContent=enabled()+' of '+MODS.length+' modules enabled';
    const d=dirty(),u=document.getElementById('mcs-unsaved'),a=document.getElementById('mcs-actions');
    if(u)u.style.display=d?'':'none';if(a)a.style.display=d?'':'none';
  };
  window.mcsToggle=function(k,on){
    if(!can())return;const m=mod(k);if(!m)return;const b=edit();
    b.mods[k]=!!on;
    if(on&&m.subs.length&&!m.subs.some(function(x){return b.subs[k][x];}))m.subs.forEach(function(x){b.subs[k][x]=true;});
    after(k);
  };
  window.mcsSub=function(k,i,on){
    if(!can())return;const m=mod(k);if(!m||!m.subs[i])return;const b=edit();
    b.subs[k][m.subs[i]]=!!on;
    const c=document.querySelector('#mcs-'+k+' .mcs-count');if(c)c.textContent=subLine(m);
    after(null);
  };
  window.mcsSave=function(){
    if(!can()||!draft)return;mcShowBook[draftEnt]=draft;draft=null;
    if(typeof presSaveSoon==='function')presSaveSoon();
    if(typeof refreshCsSidebar==='function')refreshCsSidebar();
    showToast('Module Control saved','success',enabled()+' of '+MODS.length+' modules enabled.');
  };
  window.mcsDiscard=function(){draft=null;if(typeof refreshCsSidebar==='function')refreshCsSidebar();};
  window.addEventListener('load',function(){
    if(typeof mcTabHTML!=='function')return;
    const t0=mcTabHTML;
    mcTabHTML=function(){
      const client=typeof emsClientOnly==='function'&&emsClientOnly();
      if(!client||!can())return t0.apply(this,arguments);
      return viewHTML();
    };
  });
})();
