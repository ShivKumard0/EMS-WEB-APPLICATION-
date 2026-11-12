/* ══ EMS TIDY: fewer tabs, one Manage action, client-company chrome ═══════
   Screens and navigation only; every view, rule and permission is unchanged.
   - Funding & Budgets and Corporate Cards: the primary views stay tabs;
     Reports, Settings and Controls open from an authorized Manage action,
     each with a way back. The tab lists themselves (bgPageTabs, ccPageTabs)
     are unchanged, so every link and check that opens a view still does.
   - An EMS client company (entity.emsOnly): no Global Employee tab, no HR
     or e-sign settings it does not use, no platform role templates for its
     own admins, and a profile menu without non-EMS or preview entries. */
const EMS_TIDY_MANAGE={bgSetPageTab:['reports','settings'],ccSetPageTab:['stmts','controls','reports']};   // Corporate Cards: these open from the menu, not Manage (card-menu.js)
const emsTidyLast={},emsTidyMenus={},EMS_TIDY_TABLESS={ccSetPageTab:true};
let emsTidyWasOpen=false;
function emsTidyClient(){return typeof emsClientOnly==='function'&&emsClientOnly();}
const emsTidyTabs0=buildModuleTabsHTML;
buildModuleTabsHTML=function(tabs,active,handler,full){
  /* Employees in an EMS client company: direct employees only. */
  if(handler==='setEmpSubTab'&&emsTidyClient()){
    tabs=tabs.filter(function(t){return t.id!=='global';});
    if(typeof empSubTab!=='undefined'&&empSubTab==='global')empSubTab='direct';
    if(tabs.length<2)return '';
  }
  const mv=EMS_TIDY_MANAGE[handler];
  if(!mv)return emsTidyTabs0(tabs,active,handler,full);
  const prim=tabs.filter(function(t){return mv.indexOf(t.id)<0;}),man=tabs.filter(function(t){return mv.indexOf(t.id)>=0;});
  /* Corporate Cards has no tabs and no Manage button: its menu maps every view - Cards, Requests & Loads, Statements &
     Reconciliation, Controls, Reports (product owner, 11 Nov 2026; js/card-menu.js). */
  if(EMS_TIDY_TABLESS[handler])return '';
  if(!man.length||!prim.length)return emsTidyTabs0(tabs,active,handler,full);
  emsTidyMenus[handler]=man;
  if(mv.indexOf(active)>=0){
    const back=prim.find(function(t){return t.id===emsTidyLast[handler];})||prim[0];
    const cur=man.find(function(t){return t.id===active;});
    return '<div style="display:flex;align-items:center;gap:12px;margin:0 0 14px">'
      +'<button class="ep-back" style="margin:0" onclick="'+handler+'(\''+back.id+'\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> '+back.label+'</button>'
      +'<span class="lp-sb-section-title">'+(cur?cur.label:'')+'</span></div>';
  }
  emsTidyLast[handler]=active;
  return '<div style="display:flex;align-items:flex-start;gap:12px"><div style="flex:1;min-width:0">'+emsTidyTabs0(prim,active,handler,full)+'</div>'
    +emsTidyManageBtn(handler)+'</div>';
};
function emsTidyManageBtn(handler){
  return '<div class="adv-set-actions"><button class="btn btn-outline btn-sm" id="ems-manage-btn" onclick="emsTidyManage(\''+handler+'\')">Manage <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px;margin-left:4px"><polyline points="6 9 12 15 18 9"/></svg></button></div>';
}
function emsTidyManage(handler){
  const btn=document.getElementById('ems-manage-btn');if(!btn)return;
  let m=document.getElementById('ems-manage-menu');
  if(!m){const w=document.createElement('div');w.className='ct-action-wrap';w.innerHTML='<div class="ct-action-menu" id="ems-manage-menu" role="menu"></div>';document.body.appendChild(w);m=w.firstChild;}
  if(emsTidyWasOpen){emsTidyWasOpen=false;m.classList.remove('open');return;}
  m.innerHTML=(emsTidyMenus[handler]||[]).map(function(t){return '<div class="ct-act-item" role="menuitem" onclick="emsTidyPick(\''+handler+'\',\''+t.id+'\')"><span>'+t.label+'</span></div>';}).join('');
  document.querySelectorAll('.ct-action-menu.open').forEach(function(x){x.classList.remove('open');});
  m.classList.add('open');
  placeAnchoredMenu(m,btn.getBoundingClientRect(),{alignLeft:false});
}
document.addEventListener('mousedown',function(e){
  if(e.target&&e.target.closest&&e.target.closest('#ems-manage-btn')){const m=document.getElementById('ems-manage-menu');emsTidyWasOpen=!!(m&&m.classList.contains('open'));}
},true);
function emsTidyPick(handler,id){const m=document.getElementById('ems-manage-menu');if(m)m.classList.remove('open');emsTidyWasOpen=false;const f=window[handler];if(typeof f==='function')f(id);}

/* Company Settings of an EMS client: the sections it uses. */
const EMS_CLIENT_HIDDEN_CS=['leaves','attendance','esign'];
(function(){
  const cs0=csVisibleTabs;
  csVisibleTabs=function(){const t=cs0.apply(this,arguments);return emsTidyClient()?t.filter(function(x){return EMS_CLIENT_HIDDEN_CS.indexOf(x.id)<0;}):t;};
})();

/* Employees of an EMS client company. */
(function(){
  if(typeof emsClientHidden!=='function')return;
  const h0=emsClientHidden;
  emsClientHidden=function(id){
    if(h0(id))return true;
    if(!emsTidyClient())return false;
    /* Someone who sees only their own record uses My Profile (documents, KYC and benefits are there). */
    if(id==='employees')return !emsCan('h2r.employee.view')&&!emsCan('h2r.employee.view.team');
    /* Benefits of someone who configures nothing are in My Profile → Wallet & Benefits (FR-WB-01 §7). */
    if(id==='wallet-benefits')return !emsCan('benefit.wallet.view')&&!emsCan('benefit.policy.view');
    return false;
  };
  /* RBAC stays as RBAC for a client company: Workspaces (its teams) and Templates (the
     platform's role definitions, read-only unless the person holds platform.template.manage). */
})();

/* The profile menu of an EMS client: no dashboard preview switches, no
   pages outside the EMS. */
(function(){
  if(typeof emsApplyChrome!=='function')return;
  const ac0=emsApplyChrome;
  emsApplyChrome=function(){
    const out=ac0.apply(this,arguments);
    const client=emsTidyClient();
    document.querySelectorAll('#user-dd .dp-group').forEach(function(el){if(client)el.style.display='none';});
    document.querySelectorAll('#user-dd .hdr-dd-item, #user-dd button, #user-dd a').forEach(function(el){
      const t=(el.textContent||'').trim();
      if(/^Apply Application$|^Help & Support$/.test(t))el.style.display=client?'none':'';
    });
    return out;
  };
})();

/* Switching company redraws the menu: each company has its own modules. */
(function(){
  if(typeof appEntityChanged!=='function')return;
  const ae0=appEntityChanged;
  appEntityChanged=function(){const out=ae0.apply(this,arguments);if(typeof lastSidebarSig!=='undefined')lastSidebarSig='';return out;};
})();
