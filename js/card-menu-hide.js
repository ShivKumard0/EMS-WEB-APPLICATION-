/* ══ CORPORATE CARDS: the first "Cards" item is off the sidebar (product owner, 13 Nov 2026) ══════════════════
   "Remove this card button from the side bar from all the profiles and from company admin as well … don't mess with
   anything else." Only the drawn menu changes: the item that opens the issued-cards screen (id 'card-list', label
   "Cards") is left out while the sidebar is built, for every profile that sees it as "Cards".
   Untouched on purpose: the screen itself and who may open it, every link and dashboard tile that opens it, the
   accordion that opens Corporate Cards when that screen shows, the search palette, the second "Cards" (the card
   product), Card List, Wallet & Benefits, Requests & Loads, Statements - and the Employee's "My Cards" (a different
   screen, their own cards; their Transactions item sits right under it). Loaded last, before login.js. */
(function(){
  if(typeof buildSidebar!=='function'||typeof window.getSidebarItems!=='function')return;
  let building=false;
  const b0=buildSidebar;
  buildSidebar=function(){building=true;try{return b0.apply(this,arguments);}finally{building=false;}};
  const g0=window.getSidebarItems;
  window.getSidebarItems=function(){
    const out=g0.apply(this,arguments);
    if(!building)return out;
    if(typeof ccAdminView==='function'&&!ccAdminView())return out;   // the Employee's "My Cards" stays
    return out.map(function(g){
      if(!g||g.dropdown!=='Corporate Cards'||!g.children)return g;
      return Object.assign({},g,{children:g.children.filter(function(c){return c.id!=='card-list';})});
    });
  };
})();
