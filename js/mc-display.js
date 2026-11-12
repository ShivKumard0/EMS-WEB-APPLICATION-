/* ══ MODULE CONTROL AS MODULE CARDS (product owner, 12 Nov 2026) ════════════════════════════════════════════════════
   Company Settings → Module Control in a client company (Nova Retail), for the Super Admin and the Company Admin: the
   modules and sub-modules of the platform's own menu (Dhi Hyperlocal's, without Funding & Budgets), section by section,
   each module a card with its switch and, when on, its sub-modules to tick. No status column, no sideways scroll.
   For showing only (product owner): the choices are kept with the company and change nothing else - menus, rights and
   the company's real module settings are untouched. The client-menu setting below it is unchanged. In the presentation. */
let mcShowBook={};   // entityId → {mods:{key:true|false}, subs:{key:{sub:true|false}}}
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const I=function(n){return typeof sbIco!=='undefined'&&sbIco[n]?sbIco[n]:'';};
  const MODS=[
    {section:'Overview',items:[{key:'dashboard',label:'Dashboard',icon:'grid',subs:[]}]},
    {section:'Workforce',items:[
      {key:'people',label:'People',icon:'users',subs:['Employees','Teams']},
      {key:'contracts',label:'Contracts',icon:'fileCheck',subs:['Overview','Templates']},
      {key:'hr-docs',label:'HR Docs',icon:'folderDoc',subs:[]}]},
    {section:'Time & Pay',items:[
      {key:'time',label:'Time & Attendance',icon:'clock',subs:['Timesheets','Leave Requests','Leave Policies','Holidays']},
      {key:'payroll',label:'Payroll Management',icon:'dollar',subs:['Payroll','Payheads']},
      {key:'expenses',label:'Expense Management',icon:'receipt',subs:['Expenses & Advances','Transactions','Capping Limit','Policies','Wallet & Benefits']},
      {key:'cards',label:'Corporate Cards',icon:'card',subs:['Cards','Requests & Loads','Statements & Reconciliation','Card Setup']},
      {key:'finance',label:'Finance',icon:'wallet',subs:['Payments']}]},
    {section:'Governance',items:[
      {key:'compliance',label:'Compliance Hub',icon:'shield',subs:['Compliance Item','Rates & Rules']},
      {key:'admin',label:'Administration',icon:'settings',subs:['Company Settings','Company Structure','Users']},
      {key:'admin-access',label:'Admin Access',icon:'lock',subs:['Assets','IT Accesses']},
      {key:'rbac',label:'RBAC',icon:'shieldCheck',subs:['Workspaces','Templates']},
      {key:'announcements',label:'Announcements',icon:'megaphone',subs:[]}]},
    {section:'Support',items:[
      {key:'chats',label:'Chats',icon:'chatLines',subs:[]},
      {key:'tickets',label:'Tickets',icon:'ticket',subs:[]}]}
  ];
  /* A client company starts with what its menu holds. */
  const START={dashboard:1,people:['Employees','Teams'],expenses:1,cards:1,finance:1,admin:['Company Settings','Company Structure'],rbac:['Templates']};
  const all=function(){const o=[];MODS.forEach(function(s){o.push.apply(o,s.items);});return o;};
  const mod=function(k){return all().find(function(m){return m.key===k;});};
  const book=function(){
    const ent=idEntity();let b=mcShowBook[ent];
    if(!b){b=mcShowBook[ent]={mods:{},subs:{}};all().forEach(function(m){const s=START[m.key];b.mods[m.key]=!!s;b.subs[m.key]={};
      m.subs.forEach(function(x){b.subs[m.key][x]=s===1||(Array.isArray(s)&&s.indexOf(x)>=0);});});}
    return b;
  };
  const can=function(){return typeof emsRole==='function'&&['Super Admin','Company Admin'].indexOf(emsRole())>=0;};
  const esc=function(s){return typeof sbEsc==='function'?sbEsc(s):String(s);};
  const count=function(m){const b=book(),n=m.subs.filter(function(x){return b.subs[m.key][x];}).length;
    return m.subs.length?(b.mods[m.key]?n+' of '+m.subs.length+' sub-modules selected':m.subs.length+' sub-module'+(m.subs.length>1?'s':'')):(b.mods[m.key]?'On':'Off');};
  function cardHTML(m){
    const b=book(),on=!!b.mods[m.key],dis=can()?'':' disabled';
    return '<div class="mcs-card" id="mcs-'+m.key+'" style="border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:14px 16px;margin-bottom:10px;background:#fff">'
      +'<div style="display:flex;align-items:center;gap:12px">'
        +'<span style="width:32px;height:32px;flex:none;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#334155"><span style="width:16px;height:16px;display:flex">'+I(m.icon)+'</span></span>'
        +'<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:var(--navy,#0f172a)">'+esc(m.label)+'</div>'
          +'<div class="mcs-count" style="font-size:12px;color:var(--gray,#6a7282)">'+count(m)+'</div></div>'
        +'<label class="cs-toggle"><input type="checkbox"'+(on?' checked':'')+dis+' onchange="mcsToggle(\''+m.key+'\',this.checked)"><span class="cs-toggle-slider"></span></label>'
      +'</div>'
      +(on&&m.subs.length?'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px">'
        +m.subs.map(function(x,i){return '<label style="display:flex;align-items:center;gap:8px;border:1px solid var(--border,#e5e7eb);border-radius:8px;padding:9px 12px;font-size:13px;color:var(--navy,#0f172a);cursor:pointer;min-width:0">'
          +'<input type="checkbox"'+(b.subs[m.key][x]?' checked':'')+dis+' onchange="mcsSub(\''+m.key+'\','+i+',this.checked)"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(x)+'</span></label>';}).join('')+'</div>':'')
      +'</div>';
  }
  window.mcsToggle=function(k,on){
    if(!can())return;const m=mod(k),b=book();if(!m)return;
    b.mods[k]=!!on;
    if(on&&m.subs.length&&!m.subs.some(function(x){return b.subs[k][x];}))m.subs.forEach(function(x){b.subs[k][x]=true;});
    const el=document.getElementById('mcs-'+k);if(el)el.outerHTML=cardHTML(m);
    if(typeof presSaveSoon==='function')presSaveSoon();
  };
  window.mcsSub=function(k,i,on){
    if(!can())return;const m=mod(k),b=book();if(!m||!m.subs[i])return;
    b.subs[k][m.subs[i]]=!!on;
    const c=document.querySelector('#mcs-'+k+' .mcs-count');if(c)c.textContent=count(m);
    if(typeof presSaveSoon==='function')presSaveSoon();
  };
  function viewHTML(){
    return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Module Control · '+esc(idEntityName(idEntity()))+'</span></div>'
      +MODS.map(function(s){return '<div style="font-size:13px;font-weight:700;color:var(--navy,#0f172a);margin:16px 0 8px">'+esc(s.section)+'</div>'+s.items.map(cardHTML).join('');}).join('')
      +(emsRole()==='Super Admin'&&typeof mcClientMenuHTML==='function'?mcClientMenuHTML():'');   // the client-menu setting stays OpenDhi's
  }
  window.addEventListener('load',function(){
    /* The Company Admin of a client company sees the tab too. */
    if(typeof csVisibleTabs==='function'){
      const v0=csVisibleTabs;
      csVisibleTabs=function(){
        const t=v0.apply(this,arguments);
        if(!(typeof emsClientOnly==='function'&&emsClientOnly())||emsRole()!=='Company Admin'||t.some(function(x){return x.id==='module-control';}))return t;
        const order=[];(typeof CS_GROUPS!=='undefined'?CS_GROUPS:[]).forEach(function(g){order.push.apply(order,g.tabs);});
        return t.concat([{id:'module-control',label:'Module Control'}]).sort(function(a,b){return order.indexOf(a.id)-order.indexOf(b.id);});
      };
    }
    if(typeof mcTabHTML!=='function')return;
    const t0=mcTabHTML;
    mcTabHTML=function(){
      const client=typeof emsClientOnly==='function'&&emsClientOnly();
      if(!client||!can())return t0.apply(this,arguments);
      return viewHTML();
    };
  });
})();
