/* ══ SUPER ADMIN AND COMPANY ADMIN SIDEBAR: ITEMS LEFT OUT (product owner, 13 Nov 2026) ═══════════════════════════
   Only the drawn menu changes:
   - Super Admin in Dhi Hyperlocal (OpenDhi's own company, the home entity): no RBAC group (Workspaces, Templates).
     "From super admin in Dhi Hyperlocal, from the side panel hide RBAC."
   - Super Admin in Dhi Hyperlocal and Nova Retail (the presentation company): no Statements & Reconciliation and no
     Card Setup under Corporate Cards. "Also hide statement and reconciliation and card setup from the Dhi Hyperlocal
     super admin and also from Nova Retail super admin."
   - Company Admin (every company): no Statements & Reconciliation under Corporate Cards. "Also from the company admin
     from the sidebar in Corporate Cards hide statement and reconciliation."
   - Reporting Manager in Nova Retail / Opendhi: no Funding & Budgets under Expense Management. Finance Admin there: no
     Funding & Budgets under Expense Management and no Statements & Reconciliation under Corporate Cards (product owner,
     15 Nov 2026: "from reporting manager in side bar hide Funding and budgets from expenses, and from finance admin hide
     funding and budgets ... and statement and reconciliation").
   "Make sure this doesn't affect any other feature or any functionality": untouched on purpose - the screens themselves
   and who may open them, every link, dashboard tile and search-palette entry that opens them, Company Settings → Card
   Setup, the rights behind them, every other profile (Finance, verifiers, Compliance, …) and the Super Admin of every
   other company (Closedhi included). Loaded with card-menu-hide.js, before login.js. */
(function(){
  if(typeof buildSidebar!=='function'||typeof window.getSidebarItems!=='function')return;
  const role=function(){return typeof emsRoleLabel==='function'?emsRoleLabel():'';};
  const isSA=function(){return role()==='Super Admin';};
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
    if(!building)return out;
    let rbacOff=false,cardOff=[],expOff=[];
    if(isSA()){rbacOff=inHome();if(rbacOff||inNova())cardOff=CARD_OFF;}
    else if(role()==='Company Admin')cardOff=['card-statements'];
    else if(role()==='Reporting Manager'&&inNova())expOff=['budgets'];
    else if(role()==='Finance Admin'&&inNova()){expOff=['budgets'];cardOff=['card-statements'];}
    /* Opendhi, every role: no Workspaces and no Templates in the side panel (product owner, 15 Nov 2026: "in open dhi
       entity hide workspace and templates from the side panel"). Menu only, like the rest of this file. */
    const allOff=inNova()?['rbac-workspaces','rbac-templates']:[];
    if(!rbacOff&&!cardOff.length&&!expOff.length&&!allOff.length)return out;
    const OFF={'Corporate Cards':cardOff,'Expense Management':expOff};
    /* Opendhi, every role: no Finance group in the side panel (product owner, 15 Nov 2026: "remove finance from the
       side bar"). Its pages stay reachable from their links, as before. */
    const finOff=inNova();
    return out.filter(function(g){return !(rbacOff&&g&&g.dropdown==='RBAC')&&!(finOff&&g&&g.dropdown==='Finance');}).map(function(g){
      if(!g||!g.children)return g;
      const off=(OFF[g.dropdown]||[]).concat(allOff);
      if(!off.length||!g.children.some(function(c){return off.indexOf(c.id)>=0;}))return g;
      return Object.assign({},g,{children:g.children.filter(function(c){return off.indexOf(c.id)<0;})});
    }).filter(function(g){return !(g&&g.dropdown&&g.children&&!g.children.length);});
  };
})();
