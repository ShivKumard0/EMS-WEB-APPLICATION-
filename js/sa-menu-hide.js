/* ══ SUPER ADMIN SIDEBAR: ITEMS LEFT OUT (product owner, 13 Nov 2026) ══════════════════════════════════════════════
   Only the drawn menu changes, and only for the Super Admin:
   - Dhi Hyperlocal (OpenDhi's own company, the home entity): no RBAC group (Workspaces, Templates).
     "From super admin in Dhi Hyperlocal, from the side panel hide RBAC."
   - Dhi Hyperlocal and Nova Retail (the presentation company): no Statements & Reconciliation and no Card Setup under
     Corporate Cards. "Also hide statement and reconciliation and card setup from the Dhi Hyperlocal super admin and
     also from Nova Retail super admin."
   "Make sure this doesn't affect any other feature or any functionality": untouched on purpose - the screens themselves
   and who may open them, every link, dashboard tile and search-palette entry that opens them, Company Settings → Card
   Setup, the rights behind them, every other profile (Company Admin, Finance, …) and every other company (Closedhi
   included). Loaded with card-menu-hide.js, before login.js. */
(function(){
  if(typeof buildSidebar!=='function'||typeof window.getSidebarItems!=='function')return;
  const isSA=function(){return typeof emsRoleLabel==='function'&&emsRoleLabel()==='Super Admin';};
  const ent=function(){return typeof idEntity==='function'?idEntity():'';};
  const inHome=function(){return typeof ID_HOME_ENTITY!=='undefined'&&!!ID_HOME_ENTITY&&ent()===ID_HOME_ENTITY;};
  const inNova=function(){const n=typeof presNova==='function'?presNova():null;return !!n&&ent()===(n.entityId||n.id);};
  const CARD_OFF=['card-statements','card-setup'];
  let building=false;
  const b0=buildSidebar;
  buildSidebar=function(){building=true;try{return b0.apply(this,arguments);}finally{building=false;}};
  const g0=window.getSidebarItems;
  window.getSidebarItems=function(){
    const out=g0.apply(this,arguments);
    if(!building||!isSA())return out;
    const home=inHome(),cards=home||inNova();
    if(!home&&!cards)return out;
    return out.filter(function(g){return !(home&&g&&g.dropdown==='RBAC');}).map(function(g){
      if(!cards||!g||g.dropdown!=='Corporate Cards'||!g.children)return g;
      return Object.assign({},g,{children:g.children.filter(function(c){return CARD_OFF.indexOf(c.id)<0;})});
    });
  };
})();
