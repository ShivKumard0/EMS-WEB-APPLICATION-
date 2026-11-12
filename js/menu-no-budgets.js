/* ══ NO FUNDING & BUDGETS IN THE SIDEBAR FOR THE SUPER ADMIN AND COMPANY ADMIN (product owner, 12 Nov 2026) ════════
   "Remove Funding and Budget from the side bar for company admin and super admin, just remove that". Only the menu item
   (Expense Management → Funding & Budgets) is taken away for those two roles; the page, its data, its rights and every
   other way to it are unchanged, and the other roles keep the item. In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof window.getSidebarItems!=='function')return;
  const g0=window.getSidebarItems;
  window.getSidebarItems=function(){
    const out=g0.apply(this,arguments);
    const role=typeof emsRole==='function'?emsRole():'';
    if(role!=='Super Admin'&&role!=='Company Admin')return out;
    return out.filter(function(g){return g.id!=='budgets';}).map(function(g){
      return g.children&&g.children.some(function(c){return c.id==='budgets';})
        ?Object.assign({},g,{children:g.children.filter(function(c){return c.id!=='budgets';})}):g;
    });
  };
})();
