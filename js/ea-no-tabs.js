/* ══ EXPENSES & ADVANCES: NO "ALL REQUESTS" TAB, NO SETTLEMENTS (product owner, 12 Nov 2026) ══════════════════════
   "remove all request and settlements completely, in all where it is present".
   - The page has no tab strip: it opens on the list itself. For an approver, My Approvals is the first item of the
     Manage menu and opens as a page of its own with Back (as Reimbursement Queue, Reports and Settings do).
   - Settlements is gone in every profile: no Settlements button for an employee, no Settlements in Manage. An
     advance is still settled through its claims and returns; only the separate Settlements view is removed.
   - The Back link of those pages reads "Back". */
(function(){
  if(typeof advPageTabs==='function'){
    const t0=advPageTabs;
    advPageTabs=function(){return t0.apply(this,arguments).filter(function(t){return t.id!=='settlements';});};
  }
  const hasQueue=function(){return typeof expPageTabs==='function'&&expPageTabs().some(function(t){return t.id==='queue';});};
  if(typeof eaActions==='function'){
    const a0=eaActions;
    eaActions=function(){
      const a=a0.apply(this,arguments).filter(function(x){return !/^Settlements$/i.test(x[0]);});
      if(hasQueue()&&!a.some(function(x){return x[0]==='My Approvals';}))a.unshift(['My Approvals',"expSetPageTab('queue')"]);
      return a;
    };
  }
  if(typeof eaSubHead==='function'){
    const s0=eaSubHead;
    eaSubHead=function(){return s0.apply(this,arguments).replace(' All Requests</button>',' Back</button>');};
  }
  if(typeof buildExpensesHTML==='function'){
    const b0=buildExpensesHTML;
    buildExpensesHTML=function(){
      if(typeof expPageTab!=='undefined'&&expPageTab==='queue'&&hasQueue()&&typeof caQueueHTML==='function'){
        if(typeof caTick==='function')caTick();
        return '<div class="mod-page">'+eaSubHead('My Approvals')+caQueueHTML()+'</div>'+(typeof eaModalsHTML==='function'?eaModalsHTML():'');
      }
      /* The list without its tab strip: the Manage button stays on the right. */
      const m0=buildModuleTabsHTML;buildModuleTabsHTML=function(){return '';};
      try{return b0.apply(this,arguments);}finally{buildModuleTabsHTML=m0;}
    };
  }
})();
