/* ══ BENEFIT POLICIES MOVE INTO POLICIES (product owner, 13 Nov 2026) ═════════════════════════════════════════════
   "In company admin, from Wallet & Benefits remove the Wallets and Benefit Policies toggle at the top, and list all the
   benefit policies - make it inside Policies."
   - Wallet & Benefits has no Wallets | Benefit Policies toggle: it opens on Wallets, and its menu item always does.
   - Expense Management → Policies has a Policies | Benefit Policies switch at the top (the same toggle look). Policies
     is the policy documents, as before; Benefit Policies is the benefit policy list - the same screen, filters, tiles,
     + Add, Action dropdown, side panel and rules as before, now reached from Policies (the menu shows Policies and the
     page is titled Policies while it is open).
   For whoever sees Benefit Policies (Company Admin, Super Admin, Finance). Employees - who see their Entitlements in
   Wallet & Benefits, and Policies read-only - are unchanged. Benefit policies themselves, entitlements, wallet
   funding and every link that opens a benefit policy work as before. In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof buildWalletBenefitsHTML!=='function'||typeof EPOL_PAGE==='undefined')return;
  const on=function(){return typeof wbCanView==='function'&&wbCanView('policies');};
  const benefitView=function(){return typeof wbPrimaryOf==='function'&&wbPrimaryOf(wbTab)==='policies';};
  const inBenefit=function(){return on()&&typeof page!=='undefined'&&page==='wallet-benefits'&&benefitView();};
  let want=false;   // the next opening of Wallet & Benefits is the Benefit Policies switch's own
  const head=function(cur){
    return '<div style="display:flex;align-items:flex-start;gap:12px"><div style="flex:1;min-width:0">'
      +buildModuleTabsHTML([{id:'policies',label:'Policies'},{id:'benefit',label:'Benefit Policies'}],cur,'epolGo',true)+'</div></div>';
  };
  /* The switch: Policies (the documents) or Benefit Policies. */
  window.epolGo=function(v){
    if(v==='benefit'){
      if(inBenefit())return;
      if(!benefitView()){if(typeof wbDropEdit==='function')wbDropEdit();if(typeof wbModal!=='undefined')wbModal=null;wbTab='policies';}
      want=true;navigatePage('wallet-benefits');return;
    }
    if(typeof page!=='undefined'&&page===EPOL_PAGE)return;
    navigatePage(EPOL_PAGE);
  };
  /* Policies: the switch above the documents. */
  if(typeof epolPageHTML==='function'){
    const p0=epolPageHTML;
    epolPageHTML=function(){const out=p0.apply(this,arguments);return on()?'<div class="mod-page">'+head('policies')+out+'</div>':out;};
  }
  /* Wallet & Benefits: no toggle; on Benefit Policies, the Policies switch in its place. Manage views keep their Back bar. */
  const b0=buildWalletBenefitsHTML;
  buildWalletBenefitsHTML=function(){
    const out=b0.apply(this,arguments);
    if(!on()||(typeof wbIsManageView==='function'&&wbIsManageView(wbTab)))return out;
    const tmp=document.createElement('div');tmp.innerHTML=out;
    const mp=tmp.querySelector('.mod-page'),h=mp&&mp.firstElementChild;
    if(!h||!h.querySelector('.mod-tabs-row'))return out;
    if(benefitView())h.outerHTML=head('benefit');else h.remove();
    return tmp.innerHTML;
  };
  /* Opening Wallet & Benefits (its menu item, a shortcut) lands on Wallets, unless the switch asked for Benefit Policies. */
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){
      if(pg==='wallet-benefits'&&!want&&on()&&benefitView())wbTab='wallets';
      want=false;
      return n0.apply(this,arguments);
    };
  }
  /* While Benefit Policies is open: the menu shows Policies, and the page is titled Policies. */
  if(typeof getSidebarActivePage==='function'){
    const a0=getSidebarActivePage;
    getSidebarActivePage=function(pg){return pg==='wallet-benefits'&&inBenefit()?EPOL_PAGE:a0.apply(this,arguments);};
  }
  if(typeof getPageTitle==='function'){
    const t0=getPageTitle;
    getPageTitle=function(pg){return pg==='wallet-benefits'&&inBenefit()?'Policies':t0.apply(this,arguments);};
  }
})();
