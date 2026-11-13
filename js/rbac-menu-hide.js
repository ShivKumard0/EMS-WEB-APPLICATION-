/* ══ RBAC off the Super Admin's sidebar in Dhi Hyperlocal (product owner, 13 Nov 2026) ══════════════════════════
   "From super admin in Dhi Hyperlocal, from the side panel hide RBAC; make sure this doesn't affect any other feature
   or any functionality." Only the drawn menu changes: while the sidebar is built for the Super Admin in OpenDhi's own
   company (Dhi Hyperlocal, the home entity), the RBAC group (Workspaces, Templates) is left out.
   Untouched on purpose: the Workspaces and Templates screens and who may open them, every link to them (Teams, Company
   Settings → Roles & Access, the search palette), RBAC itself (rights, teams, templates), every other profile, and
   every other company - Nova Retail and Closedhi included. Loaded with card-menu-hide.js, before login.js. */
(function(){
  if(typeof buildSidebar!=='function'||typeof window.getSidebarItems!=='function')return;
  const here=function(){
    return typeof idEntity==='function'&&typeof ID_HOME_ENTITY!=='undefined'&&!!ID_HOME_ENTITY&&idEntity()===ID_HOME_ENTITY
      &&typeof emsRoleLabel==='function'&&emsRoleLabel()==='Super Admin';
  };
  let building=false;
  const b0=buildSidebar;
  buildSidebar=function(){building=true;try{return b0.apply(this,arguments);}finally{building=false;}};
  const g0=window.getSidebarItems;
  window.getSidebarItems=function(){
    const out=g0.apply(this,arguments);
    if(!building||!here())return out;
    return out.filter(function(g){return !(g&&g.dropdown==='RBAC');});
  };
})();
