/* ══ CORPORATE CARDS: its own menu dropdown (product owner, 11 Nov 2026) ══════════════════════════════════
   Corporate Cards leaves Expense Management and becomes its own dropdown under the EXPENSES heading, after Expense
   Management: Cards (the card list) and Requests & Loads (Card Requests · Card Loads · Bulk Files · Benefit Loads).
   Employees see My Cards and My Requests. The page's own Cards | Requests tabs are gone - the menu maps each view.
   No Manage button (product owner, 11 Nov 2026, "for now"): Statements & Reconciliation and Reports are menu items below
   Requests & Loads, each shown only to the people the view opens for. The Controls and Reports items were removed the same day.
   The screens are unchanged: every item opens the existing Corporate Cards page ('cards') on the matching view, so every
   link that opens a card, a request, a load, a file, a statement or a control still lands on it. */
const CCM_CARDS='card-list',CCM_REQS='card-requests',CCM_STMTS='card-statements',CCM_CTL='card-controls',CCM_REP='card-reports';
/* Each menu item and the Corporate Cards view (ccPageTabs id) it opens. */
/* No Controls item (product owner, 11 Nov 2026): a card's controls are changed from its ☰ → Controls; programme defaults stay as set.
   No Reports item either (product owner, 11 Nov 2026). */
const CCM_VIEW={'card-list':'cards','card-requests':'requests','card-statements':'stmts'};
const CCM_TITLE={'card-list':'Cards','card-requests':'Requests & Loads','card-statements':'Statements & Reconciliation','card-controls':'Controls','card-reports':'Reports'};
(function(){
  const ids=Object.keys(CCM_VIEW),isItem=function(pg){return Object.prototype.hasOwnProperty.call(CCM_VIEW,pg);};
  /* 1 · The menu: out of Expense Management, its own dropdown after it. */
  if(typeof sidebarItems!=='undefined'){
    const em=sidebarItems.find(function(g){return g.dropdown==='Expense Management';});
    if(em)em.children=em.children.filter(function(c){return c.id!=='cards';});
    if(!sidebarItems.some(function(g){return g.dropdown==='Corporate Cards';})){
      const at=sidebarItems.indexOf(em)+1,I=typeof sbIco!=='undefined'?sbIco:{};
      sidebarItems.splice(at>0?at:sidebarItems.length,0,{dropdown:'Corporate Cards',color:'green',icon:I.card||'',children:[
        {id:CCM_CARDS,label:'Cards',color:'green',icon:I.card||''},
        {id:CCM_REQS,label:'Requests & Loads',color:'green',icon:I.fileText||''},
        {id:CCM_STMTS,label:'Statements & Reconciliation',color:'green',icon:I.fileCheck||''}]});
    }
  }
  if(typeof supportPageMeta!=='undefined')ids.forEach(function(id){supportPageMeta[id]={title:CCM_TITLE[id],context:CCM_TITLE[id],filters:[],columns:[],rows:[]};});
  /* 2 · Who sees each item: the same people the Corporate Cards view opens for, while Corporate Cards is on. */
  ids.forEach(function(id){
    if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE[id]='cards';
    if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf(id)<0)EMS_CLIENT_PAGES.push(id);
    if(typeof APP_PAGE_PERMS!=='undefined'&&APP_PAGE_PERMS.cards)APP_PAGE_PERMS[id]=APP_PAGE_PERMS.cards.slice();
  });
  if(typeof appPagePermitted==='function'){
    const p0=appPagePermitted;
    appPagePermitted=function(pg){
      if(isItem(pg)){
        if(!p0('cards'))return false;
        const tabs=typeof ccPageTabs==='function'?ccPageTabs():[];
        return tabs.some(function(t){return t.id===CCM_VIEW[pg];});
      }
      return p0.apply(this,arguments);
    };
  }
  /* Employees: My Cards and My Requests (they have no statements, programme controls or reports view). */
  if(typeof window.getSidebarItems==='function'){
    const g0=window.getSidebarItems;
    window.getSidebarItems=function(){
      const out=g0.apply(this,arguments);
      if(typeof ccAdminView!=='function'||ccAdminView())return out;
      return out.map(function(g){return g.dropdown==='Corporate Cards'?Object.assign({},g,{children:g.children.map(function(c){
        return Object.assign({},c,{label:c.id===CCM_CARDS?'My Cards':c.id===CCM_REQS?'My Requests':c.label});})}):g;});
    };
  }
  /* 3 · Opening each item: the Corporate Cards page on its view. */
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg,fromDashboard){
      if(isItem(pg)){
        if(typeof ccCloseForms==='function')ccCloseForms();
        ccSel=null;ccCardsSub='cards';
        const v=CCM_VIEW[pg];
        if(v==='stmts'){ccPageTab='loads';ccLoadSub='stmts';if(typeof ccStmtView!=='undefined')ccStmtView='list';}
        else ccPageTab=v;
        if(pg===CCM_REQS){ccReqSub='requests';if(typeof ccAdminView==='function'&&ccAdminView()&&typeof ccRqReqOn==='function'&&!ccRqReqOn()&&ccRqLoadOn()){ccPageTab='loads';ccLoadSub='loads';}}
        const r=n0.call(this,'cards',fromDashboard);
        if(typeof renderADTPage==='function')renderADTPage();
        return r;
      }
      return n0.apply(this,arguments);
    };
  }
  /* 4 · The menu highlight and the page title follow the view on screen. */
  const onStmts=function(){return typeof ccPageTab!=='undefined'&&ccPageTab==='loads'&&typeof ccLoadSub!=='undefined'&&ccLoadSub==='stmts';};
  const onReqs=function(){return typeof ccPageTab!=='undefined'&&(ccPageTab==='requests'||ccPageTab==='loads')&&!onStmts();};
  const onTxn=function(){return typeof ccTxnPageOn==='function'&&ccTxnPageOn();};
  const itemOnScreen=function(){
    if(onStmts())return CCM_STMTS;
    if(onReqs())return CCM_REQS;
    if(ccPageTab==='controls')return CCM_CTL;
    if(ccPageTab==='reports')return CCM_REP;
    return CCM_CARDS;
  };
  if(typeof getSidebarActivePage==='function'){
    const a0=getSidebarActivePage;
    getSidebarActivePage=function(pg){
      if(isItem(pg))return pg;
      const r=a0.apply(this,arguments);
      if(pg==='cards'&&!onTxn())return itemOnScreen();
      return r;
    };
  }
  if(typeof getPageTitle==='function'){
    const g0=getPageTitle;
    getPageTitle=function(pg){
      if(pg==='cards'&&!onTxn()){
        const admin=typeof ccAdminView!=='function'||ccAdminView();
        if(!admin)return ccPageTab==='cards'?'My Cards':onReqs()?'My Requests':'Corporate Cards';
        return CCM_TITLE[itemOnScreen()];
      }
      if(isItem(pg))return CCM_TITLE[pg];
      return g0.apply(this,arguments);
    };
  }
})();
