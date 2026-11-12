/* ══ TRANSACTIONS: its own menu item under Expense Management (product owner, 10 Nov 2026) ══════════════════════
   Card transactions moved out of Corporate Cards → Cards (where they were a sub-view) into the Expense Management menu,
   after Expenses & Advances and above Capping Limit. The screen itself is unchanged: it is still Corporate Cards' 'txns'
   view (page 'cards', ccCardsSub 'txns'), so every link that opens a transaction, a matching exception or a dispute's
   payment lands on it, and every rule, permission and action is the same. What changes is how it is reached and shown:
   - the menu item 'card-transactions' opens that view, titled "Transactions", without the Corporate Cards tabs;
   - the menu highlights Transactions while it shows, and Corporate Cards otherwise;
   - it is listed for people who may use the view (a card admin view with a card transaction right), and only while
     Corporate Cards is switched on (Module Control), in client companies too. */
const CTX_PAGE='card-transactions';
const CTX_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 7h13"/><path d="M16 3l4 4-4 4"/><path d="M17 17H4"/><path d="M8 13l-4 4 4 4"/></svg>';
(function(){
  /* 1 · The menu item, after Expenses & Advances. */
  if(typeof sidebarItems!=='undefined')sidebarItems.forEach(function(g){
    if(!g.children||g.children.some(function(c){return c.id===CTX_PAGE;}))return;
    const i=g.children.findIndex(function(c){return c.id==='expenses';});
    if(i>=0)g.children.splice(i+1,0,{id:CTX_PAGE,label:'Transactions',color:'green',icon:CTX_ICON});
  });
  if(typeof supportPageMeta!=='undefined')supportPageMeta[CTX_PAGE]={title:'Transactions',context:'Transactions',filters:[],columns:[],rows:[]};
  /* 2 · Who sees it: the same people the view opens for; part of Corporate Cards in Module Control and client menus. */
  if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE[CTX_PAGE]='cards';
  if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf(CTX_PAGE)<0)EMS_CLIENT_PAGES.push(CTX_PAGE);
  if(typeof APP_PAGE_PERMS!=='undefined')APP_PAGE_PERMS[CTX_PAGE]=['card.transaction.view.all','card.transaction.view.team','card.transaction.record','card.transaction.verify'];
  if(typeof appPagePermitted==='function'){
    const p0=appPagePermitted;
    appPagePermitted=function(pg){
      if(pg===CTX_PAGE)return typeof ccAdminView==='function'&&ccAdminView()&&typeof ccTxnAdminView==='function'&&ccTxnAdminView();
      return p0.apply(this,arguments);
    };
  }
  /* 3 · Opening it, and leaving it. A link that opens a transaction or a matching exception sets the view itself and
     then navigates: those keep it (ctxKeep). Any other navigation - Corporate Cards from the menu, another page -
     leaves Transactions, so Corporate Cards always opens on its own Cards view. */
  let ctxKeep=false;
  ['ccOpenTxnUI','ccCsxOpenUI'].forEach(function(n){
    const f=window[n];if(typeof f!=='function')return;
    window[n]=function(){ctxKeep=true;try{return f.apply(this,arguments);}finally{ctxKeep=false;}};
  });
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg,fromDashboard){
      if(pg===CTX_PAGE){
        if(typeof ccCloseForms==='function')ccCloseForms();
        ccSel=null;ccPageTab='cards';ccCardsSub='txns';
        return n0.call(this,'cards',fromDashboard);
      }
      if(!ctxKeep&&typeof ccCardsSub!=='undefined'&&ccCardsSub==='txns')ccCardsSub='cards';
      return n0.apply(this,arguments);
    };
  }
  /* The Corporate Cards tabs lead to Corporate Cards' own views. */
  if(typeof ccSetPageTab==='function'){
    const t0=ccSetPageTab;
    ccSetPageTab=function(t){if(t==='cards'&&typeof ccCardsSub!=='undefined'&&ccCardsSub==='txns')ccCardsSub='cards';return t0.apply(this,arguments);};
  }
  /* 4 · The menu highlight and the page title follow the view on screen. */
  if(typeof getSidebarActivePage==='function'){
    const a0=getSidebarActivePage;
    getSidebarActivePage=function(pg){
      if(pg===CTX_PAGE||(pg==='cards'&&typeof ccTxnPageOn==='function'&&ccTxnPageOn()))return CTX_PAGE;
      return a0.apply(this,arguments);
    };
  }
  if(typeof getPageTitle==='function'){
    const g0=getPageTitle;
    getPageTitle=function(pg){
      if(pg===CTX_PAGE||(pg==='cards'&&typeof ccTxnPageOn==='function'&&ccTxnPageOn()))return 'Transactions';
      return g0.apply(this,arguments);
    };
  }
})();
