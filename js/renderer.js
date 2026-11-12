function dispatchAIContractWizardPage(el){
  if(page==='ai-contract-assistant'){el.innerHTML=buildAIContractAssistantHTML();return;}
  if(page==='ai-employee-created'){el.innerHTML=buildAIEmployeeCreatedHTML();return;}
  if(page==='contract-type-select'){el.innerHTML=buildContractTypeSelectHTML();return;}
  if(page==='contract-eor'){if(aiAssistedFlow){el.innerHTML=buildAIAssistedContractSplitHTML('EOR');initAICtChatPanel();return;}el.innerHTML=buildEORContractHTML();return;}
  if(page==='contract-peo'){if(aiAssistedFlow){el.innerHTML=buildAIAssistedContractSplitHTML('PEO');initAICtChatPanel();return;}el.innerHTML=buildPEOContractHTML();return;}
  if(page==='ai-proposal-created'){el.innerHTML=buildAIProposalCreatedHTML();aiScheduleAutoAdvance('ai-proposal-created',aiSendProposalForApproval,1300);return;}
  if(page==='ai-proposal-waiting-approval'){el.innerHTML=buildAIProposalWaitingApprovalHTML();return;}
  if(page==='ai-contract-document'){el.innerHTML=buildAIContractDocumentHTML();aiScheduleAutoAdvance('ai-contract-document',aiSendContractForApproval,1300);return;}
  if(page==='ai-contract-waiting-approval'){el.innerHTML=buildAIContractWaitingApprovalHTML();return;}
  if(page==='ai-onboarding-run'){el.innerHTML=buildAIOnboardingRunHTML();return;}
  if(page==='ai-journey-complete'){el.innerHTML=buildAIJourneyCompleteHTML();return;}
}
/* Takes an element id OR an element. The element form is what lets a repaint
   build the next version of a page into a detached node, off screen, so it can
   be compared against what is on screen instead of replacing it. */
function renderPageContent(target){
  const el=typeof target==='string'?document.getElementById(target):target;
  if(!el)return;
  /* Module Control and role scoping (js/ems-access.js): a disabled module or
     a page outside the role's menu answers with a notice, not the page. */
  if(typeof emsApplyChrome==='function')emsApplyChrome();
  if(typeof emsPageGuard==='function'){const g=emsPageGuard(page);if(g){el.innerHTML=g;return;}}
  if(isAIContractWizardPage(page)){
    const cjStage=aiCtJourneyStage();
    if(cjStage>=0){
      el.innerHTML='<div class="aicj-wrap">'+buildAIContractJourneyBarHTML(cjStage)+'<div id="aicj-inner"></div></div>';
      dispatchAIContractWizardPage(document.getElementById('aicj-inner'));
    }else{
      dispatchAIContractWizardPage(el);
    }
    return;
  }
  if(page==='cfg-overview'){el.innerHTML=buildCfgOverviewHTML();return;}
  if(page==='cfg-systems'){el.innerHTML=buildCfgSystemsHTML();return;}
  if(page==='cfg-system-detail'){el.innerHTML=buildCfgSystemDetailHTML();return;}
  if(page==='cfg-system-add'){el.innerHTML=buildCfgSystemAddHTML();return;}
  if(page==='cfg-data-foundation'){el.innerHTML=buildCfgDataFoundationHTML();return;}
  if(page==='cfg-model-detail'){el.innerHTML=buildCfgModelDetailHTML();return;}
  if(page==='cfg-model-add'){el.innerHTML=buildCfgModelAddHTML();return;}
  if(page==='cfg-context-journey'){el.innerHTML=buildCfgContextJourneyHTML();return;}
  if(page==='cfg-journey-detail'){el.innerHTML=buildCfgJourneyDetailHTML();return;}
  if(page==='cfg-agents'){el.innerHTML=buildCfgAgentsHTML();return;}
  if(page==='ai-executive'){el.innerHTML=buildAIExecutiveDashboardHTML();return;}
  if(page==='ai-journey-detail'){el.innerHTML=buildAIJourneyDetailHTML();return;}
  if(page==='ai-automate-form'){el.innerHTML=buildAutomateJourneyFormHTML();return;}
  if(page==='ai-active-automation'){el.innerHTML=buildAIActiveAutomationHTML();return;}
  if(page==='ai-run-detail'){el.innerHTML=buildAIRunDetailHTML();return;}
  if(page==='ai-journey-run'){el.innerHTML=buildAIJourneyRunHTML();return;}
  if(page==='cost-calculator'){el.innerHTML=buildCostCalculatorPageHTML();initCostCalcPage();return;}
  if(page==='leave-policies'){el.innerHTML=buildLeavePoliciesHTML();return;}
  if(page==='employees'){el.innerHTML=buildEmployeesHTML();return;}
  if(page==='timesheet'){el.innerHTML=buildTimesheetHTML();return;}
  if(page==='leave-balance'){el.innerHTML=buildLeaveBalanceHTML();return;}
  if(page==='direct'){el.innerHTML=buildDirectListingHTML();return;}
  if(page==='global'){el.innerHTML=buildGlobalListingHTML();return;}
  if(page==='teams'){el.innerHTML=buildTeamsListingHTML();return;}
  if(page==='contracts'){el.innerHTML=ctLandingOpen?buildContractsLandingHTML():buildContractsListingHTML();return;}
  /* The two type-specific intakes. They sit OUTSIDE the AI contract wizard
     dispatch above: that block paints the AI journey bar, and these are
     reached from the chooser, not from a journey. */
  if(page==='contract-immigration'){el.innerHTML=buildImmigrationIntakeHTML();return;}
  if(page==='contract-contractor'){el.innerHTML=buildContractorIntakeHTML();return;}
  if(page==='all-leaves'){el.innerHTML=buildAllLeavesHTML();return;}
  if(page==='leave-policy-edit'){el.innerHTML=buildEditLeavePolicyHTML();return;}
  if(page==='payheads'){el.innerHTML=buildPayheadsPageHTML();return;}
  if(page==='holidays'){el.innerHTML=buildHolidaysPageHTML();return;}
  if(page==='announcements'){el.innerHTML=buildAnnouncementsHTML();return;}
  if(page==='asset-allocation'){el.innerHTML=buildAssetAllocationHTML();return;}
  if(page==='it-access'){el.innerHTML=buildItAccessHTML();return;}
  if(page==='hr-docs'){el.innerHTML=buildHrDocsHTML();return;}
  if(page==='expenses'){el.innerHTML=buildExpensesHTML();return;}
  if(page==='capping-limit'){el.innerHTML=buildCappingLimitHTML();return;}
  if(page==='wallet-benefits'){el.innerHTML=buildWalletBenefitsHTML();return;}
  if(page==='advances'){el.innerHTML=buildAdvancesHTML();return;}
  if(page==='budgets'){el.innerHTML=buildBudgetsHTML();return;}
  if(page==='cards'){el.innerHTML=buildCardsHTML();return;}
  if(page==='rbac-templates'){el.innerHTML=buildRbacTemplatesHTML();return;}
  if(page==='rbac-workspaces'){el.innerHTML=buildRbacWorkspacesHTML();return;}
  if(page==='payments'){el.innerHTML=buildPaymentsHTML();return;}
  if(page==='compliance'){el.innerHTML=buildComplianceItemsHTML();return;}
  if(page==='rates-rules'){el.innerHTML=buildRatesRulesHTML();return;}
  if(page==='contract-templates'){el.innerHTML=buildContractTemplatesHTML();return;}
  if(page==='my-timesheet'){el.innerHTML=buildMyTimesheetHTML();return;}
  if(page==='all-timesheet'){el.innerHTML=buildAllTimesheetHTML();return;}
  if(page==='at-timesheet-view'){el.innerHTML=buildMyTimesheetHTML(true);return;}
  if(page==='settings'){el.innerHTML=buildCompanySettingsHTML();return;}
  if(page==='my-profile'){el.innerHTML=buildMyProfileHTML();return;}
  if(page==='apply-application'){el.innerHTML=buildApplyApplicationHTML();return;}
  if(page==='switch-entity'){el.innerHTML=buildSwitchEntityHTML();return;}
  if(page==='support-tickets'){el.innerHTML=buildTicketsPageHTML();return;}
  if(page==='chats'){el.innerHTML=buildChatsPageHTML();return;}
  if(page==='dashboard'){
    el.innerHTML=dashboardContentHTML;
    /* The snapshot carries module links; hide the ones a switched-off module owns. */
    if(typeof emsApplyChrome==='function')emsApplyChrome();
    // Numbers come from the data, not from the snapshot's typed-in markup.
    if(typeof syncDashCardCounts==='function')syncDashCardCounts(el);
    // The employee's lifecycle tracker is drawn from the live record.
    if(typeof empDashRender==='function')empDashRender(el);
    // So are the announcements under Key Metrics.
    if(typeof annRender==='function')annRender(el);    // The snapshot always has the first tab active — restore the one the user was on.
    if(window.activeDashboardTab&&typeof switchDashboard==='function')switchDashboard(window.activeDashboardTab);
    _attRestore();   // ...and the snapshot is always the idle clock — see _attRestore
    // The Required documents popup, when its preview switch is on (js/req-docs-popup.js).
    if(typeof rdRender==='function')rdRender(el);
    return;
  }
  el.innerHTML=buildListingHTML(page);
}

/* == SURGICAL REPAINT =======================================================

   THE PROBLEM. Everything in this app repaints by calling renderADTPage(),
   which wrote the whole page into #adt-content again. That is right when you
   NAVIGATE - a new page should arrive. It is wrong for everything else. A
   filter, a Clear Filters, a page-number click, a status toggle: each of them
   changes a handful of rows and a couple of counts, and each of them threw the
   entire page away and built a new one. The costs were all visible - the
   entrance animation replayed on every click so a filter felt like a page
   load, the scroll jumped back to the top, an open detail panel was rebuilt
   under the pointer, and a half-typed input lost what was in it.

   WHAT HAPPENS NOW. The page is still BUILT the same way. The builders are
   pure functions of state - they return markup and touch nothing - which is
   what makes this safe to do globally rather than page by page. The new markup
   is rendered into a DETACHED node and then PATCHED onto the live DOM:
   patchDom walks both trees together and touches only what actually differs.
   A subtree whose markup is unchanged is never visited, so everything that did
   not change keeps its identity - its scroll offset, its focus, its canvas,
   its listeners.

   WHY isEqualNode IS THE WHOLE TRICK. It compares tag, attributes and the
   entire subtree, and it ignores live PROPERTIES. So an <input> the user has
   typed into still equals its freshly built twin - the typed text is a
   property, not an attribute - and is left alone. That is exactly the
   behaviour wanted here, and the opposite of what innerHTML did.

   WHAT STILL REBUILDS WHOLESALE. Navigation, and the three page families whose
   render does more than write markup: the AI contract wizard (starts a chat
   panel and auto-advance timers), the cost calculator (initCostCalcPage) and
   the dashboard (restores the active tab). All three run their init against
   the document, so they cannot be built into a detached node. See
   canPatchPage.
   ========================================================================== */

/* The page whose markup is currently in #adt-content. Null until first paint. */
let renderedPage=null;

function canPatchPage(pg){
  if(renderedPage!==pg)return false;              /* navigation, not a repaint */
  if(typeof isAIContractWizardPage==='function'&&isAIContractWizardPage(pg))return false;
  return pg!=='cost-calculator'&&pg!=='dashboard';
}

/* Attributes only, never properties: what the user has typed, checked, opened
   or scrolled lives in a property and none of it is ours to overwrite. */
function syncAttrs(live,next){
  const nx=next.attributes;
  for(let i=0;i<nx.length;i++){
    const a=nx[i];
    if(live.getAttribute(a.name)!==a.value)live.setAttribute(a.name,a.value);
  }
  const lv=live.attributes;
  for(let i=lv.length-1;i>=0;i--){
    const a=lv[i];
    if(!next.hasAttribute(a.name))live.removeAttribute(a.name);
  }
}

/* A control that HAS been re-rendered needs its property put back in step with
   its attribute, or a filter would keep showing the old choice while the markup
   says otherwise. Only ever reached for controls that actually differ. */
function syncFormState(live,next){
  if(live.tagName==='INPUT'){
    if(next.hasAttribute('value')&&live.value!==next.getAttribute('value'))live.value=next.getAttribute('value');
    live.checked=next.hasAttribute('checked');
  }else if(live.tagName==='OPTION'){
    live.selected=next.hasAttribute('selected');
  }
}

/* Walk the two trees together. Children are matched BY POSITION: every one of
   these lists comes out of the same builder in the same order every time, so
   position is a reliable key and a keyed diff would buy nothing for the extra
   surface. Nodes are MOVED out of the new tree rather than cloned - it is
   detached and thrown away straight after, and moving keeps any handler the
   builder attached as a property. */
/* Children the BUILDERS never emit are invisible to the differ. tab-slide.js
   plants its .tab-ind marker straight into the live bar, so .mod-tabs has three
   children on screen and two in the freshly built tree. Matching is positional,
   so that surplus trailing node was removed on EVERY repaint and the observer
   built a new one - and a new marker starts at opacity 0 and fades back in, so
   the pill behind the active tab blinked every time anything on the page was
   repainted. Skipping these keeps the positions lined up and leaves the marker
   alone; it is absolutely positioned, so where it sits among its siblings does
   not matter. */
function patchVisible(nodes){
  return nodes.filter(function(n){
    return !(n.nodeType===1&&n.hasAttribute('data-patch-keep'));
  });
}

function patchDom(live,next){
  if(live.isEqualNode(next))return;               /* identical subtree - do not descend */
  if(live.nodeType!==next.nodeType||live.nodeName!==next.nodeName){
    live.replaceWith(next);
    return;
  }
  if(live.nodeType!==1){                          /* text, comment */
    if(live.nodeValue!==next.nodeValue)live.nodeValue=next.nodeValue;
    return;
  }
  syncAttrs(live,next);
  syncFormState(live,next);
  /* Snapshot both child lists first: the loop moves nodes out of `next` and
     removes them from `live`, and a live NodeList would shift underneath it. */
  const a=patchVisible(Array.prototype.slice.call(live.childNodes));
  const b=Array.prototype.slice.call(next.childNodes);
  const n=Math.min(a.length,b.length);
  for(let i=0;i<n;i++)patchDom(a[i],b[i]);
  for(let i=n;i<a.length;i++)live.removeChild(a[i]);
  for(let i=n;i<b.length;i++)live.appendChild(b[i]);
}

/* The children only. The staging <div> is a carrier, not part of the page:
   syncing ITS attributes onto #adt-content would strip the id off the element
   the whole app looks itself up by. */
function patchChildren(live,next){
  const x=patchVisible(Array.prototype.slice.call(live.childNodes));
  const y=Array.prototype.slice.call(next.childNodes);
  const n=Math.min(x.length,y.length);
  for(let i=0;i<n;i++)patchDom(x[i],y[i]);
  for(let i=n;i<x.length;i++)live.removeChild(x[i]);
  for(let i=n;i<y.length;i++)live.appendChild(y[i]);
}

/* Build the page off screen, then patch it in. */
function patchPageContent(el){
  const stage=document.createElement('div');
  renderPageContent(stage);
  patchChildren(el,stage);
}

function renderADTPage(){
  const title=document.getElementById('adt-page-title');
  if(title)title.textContent=getPageTitle(page);
  // Show/hide + button in topbar based on current page
  const addBtn=document.getElementById('tb-page-add-btn');
  if(addBtn){
    const noAddPages=['dashboard','leave-balance','cost-calculator','leave-policy-edit','team-add','employee-add','hr-docs','contract-type-select','contract-eor','contract-peo','contract-immigration','contract-contractor','timesheet','my-timesheet','all-timesheet','at-timesheet-view','my-profile','apply-application','chats','switch-entity','ai-executive','ai-journey-detail','ai-automate-form','ai-active-automation','ai-run-detail','ai-journey-run','ai-contract-assistant','ai-proposal-created','ai-proposal-waiting-approval','ai-employee-created','ai-contract-document','ai-contract-waiting-approval','ai-onboarding-run','ai-journey-complete','cfg-overview','cfg-systems','cfg-system-detail','cfg-system-add','cfg-data-foundation','cfg-model-detail','cfg-model-add','cfg-context-journey','cfg-journey-detail','cfg-agents'];
    const show=!noAddPages.includes(page)&&(typeof emsCanAdd!=='function'||emsCanAdd(page))
      &&(page!=='advances'||typeof advCanAddHere!=='function'||advCanAddHere())   // Advances & Imprest: the + follows the open tab
      &&(page!=='budgets'||typeof bgCanAddHere!=='function'||bgCanAddHere())   // and so does Funding & Budgets
      &&(page!=='cards'||typeof ccCanAddHere!=='function'||ccCanAddHere());   // and Corporate Cards
    addBtn.style.display=show?'':'none';
    if(show){
      const specialHandlers={'leave-policies':()=>startAddLeavePolicy(),'announcements':()=>anmStartCreate(),'expenses':()=>startAddExpense(),'capping-limit':()=>startAddCap(),'wallet-benefits':()=>wbStartAdd(),'advances':()=>advStartAddHere(),'budgets':()=>bgStartAddHere(),'cards':()=>ccStartAddHere(),'rbac-templates':()=>startAddRb(),'rbac-workspaces':()=>startAddWs(),'employees':()=>embPlusClick(),'direct':()=>embPlusClick(),'global':()=>embPlusClick(),'settings':()=>ncStart()};
      addBtn.onclick=specialHandlers[page]||(()=>addListingItem(page));
    }
  }
  /* The Cost Calculator prices an employment cost - gross to total employer
     burden - which is an EOR/PEO question. An immigration case is priced on
     government fees and professional time, and a contractor on a rate, so
     the button shows ONLY inside the EOR and PEO listings. The type-card
     landing and the All band are hidden too: no employment type has been
     chosen there, so the button would be offering a number for work that may
     not be employment at all. costCalc lives on the type config. */
  const ccBtn=document.getElementById('tb-cost-calc-btn');
  const ccOK=page==='contracts'&&!ctLandingOpen&&ctTypeFilter!==CT_TYPE_ALL&&!!(CT_TYPES[ctTypeFilter]||{}).costCalc;
  if(ccBtn)ccBtn.style.display=ccOK?'':'none';
  const ohBtn=document.getElementById('tb-opt-hol-btn');
  if(ohBtn)ohBtn.style.display=page==='holidays'?'':'none';
  const expBtn=document.getElementById('tb-exp-export-btn');
  if(expBtn){
    /* Export follows the page (claims, or capping limits), its RBAC right and
       Module Control, and stays out of the way while a form is open. */
    const advRep=page==='advances'&&typeof advPageTab!=='undefined'&&advPageTab==='reports';
    const bgRepOn=page==='budgets'&&typeof bgPageTab!=='undefined'&&bgPageTab==='reports';
    const ccRepOn=page==='cards'&&typeof ccPageTab!=='undefined'&&ccPageTab==='reports';
    const expPerm=page==='expenses'?'expense.export':page==='capping-limit'?'expense.policy.export':advRep?'advance.report.export':bgRepOn&&typeof bgRepExportPerm==='function'?bgRepExportPerm():ccRepOn?'card.report.export':'';
    expBtn.style.display=expPerm&&(typeof mcPageAllowed!=='function'||mcPageAllowed(page))&&(typeof emsCan!=='function'||emsCan(expPerm))
      &&!(typeof caFormOpen==='function'&&caFormOpen())&&!(advRep&&typeof advFormOpen==='function'&&advFormOpen())&&!(bgRepOn&&typeof bgFormOpen==='function'&&bgFormOpen())&&!(ccRepOn&&typeof ccFormOpen==='function'&&ccFormOpen())?'':'none';
    expBtn.title=page==='capping-limit'?'Export the filtered capping limits as CSV':advRep||bgRepOn||ccRepOn?'Export the report on screen as CSV':'Export the list on screen as CSV';
  }
  /* The sidebar depends on the page, the collapse state and which dropdown is
     open - none of which a filter can touch. Rebuilding it on every repaint was
     the other half of the page-reload feeling, so it is rebuilt only when one of
     those actually differs. The signature is stamped by buildSidebar itself, so
     a rebuild from anywhere else (the collapse toggle, a dropdown click) keeps
     this check honest. */
  if(sidebarSig('adt-sidebar',adtSidebarCollapsed,getSidebarActivePage(page))!==lastSidebarSig)
    buildSidebar('adt-sidebar',adtSidebarCollapsed,getSidebarActivePage(page));
  const sidebar=document.getElementById('adt-sidebar');
  if(sidebar)sidebar.style.display=page==='cost-calculator'?'none':'';
  const content=document.getElementById('adt-content');
  if(canPatchPage(page)&&content&&content.firstChild){
    patchPageContent(content);
  }else{
    renderPageContent('adt-content');
    /* Only a NEW page starts at the top. Repainting the page you are already on
       has to leave the scroll exactly where you left it. */
    if(content)content.scrollTop=0;
  }
  renderedPage=page;
  // A record that was just filed is marked; this is where it is found on screen.
  if(typeof lpFlashNew==='function')lpFlashNew();
  // A tab holding unsaved edits keeps its dot through any repaint.
  if(typeof sbMarkDraftTabs==='function')sbMarkDraftTabs();
}

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ INIT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
const dashboardContentHTML=document.getElementById('adt-content').innerHTML;
// A narrow window starts with the rail folded (sbFitViewport, core.js).
if(typeof sbFitViewport==='function')sbFitViewport();
renderADTPage();

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ COST CALCULATOR ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
const ccCountries=[
  {id:'nl',name:'Netherlands',flag:'NL',currency:'EUR',symbol:'ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬',salary:60000,
    items:[
      {label:'Base Salary',note:'Annual gross',val:60000,pct:null},
      {label:'Employer Social Security (AOW/WW/WAO)',note:'23% of gross',val:13800,pct:'23%'},
      {label:'Holiday Pay (Vakantiegeld)',note:'8% of gross',val:4800,pct:'8%'},
      {label:'Pension Contribution',note:'5% of gross',val:3000,pct:'5%'},
      {label:'Work-related Expenses Allowance',note:'Flat per employee per year',val:750,pct:null}
    ]},
  {id:'in',name:'India',flag:'IN',currency:'INR',symbol:'ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹',salary:1200000,
    items:[
      {label:'Base Salary (CTC)',note:'Annual gross',val:1200000,pct:null},
      {label:'Employer PF (Provident Fund)',note:'12% of basic salary',val:86400,pct:'12%'},
      {label:'Employer ESI',note:'3.25% on wages up to threshold',val:39000,pct:'3.25%'},
      {label:'Gratuity Provision',note:'4.81% of basic salary',val:34632,pct:'4.81%'},
      {label:'LWF & Professional Tax',note:'State levied, fixed amount',val:2400,pct:null}
    ]},
  {id:'de',name:'Germany',flag:'DE',currency:'EUR',symbol:'ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬',salary:55000,
    items:[
      {label:'Base Salary',note:'Annual gross',val:55000,pct:null},
      {label:'Pension Insurance (Rentenversicherung)',note:'9.3% of gross',val:5115,pct:'9.3%'},
      {label:'Unemployment Insurance',note:'1.2% of gross',val:660,pct:'1.2%'},
      {label:'Health Insurance (Krankenversicherung)',note:'7.3% of gross',val:4015,pct:'7.3%'},
      {label:'Long-term Care Insurance (Pflegeversicherung)',note:'1.775% of gross',val:976,pct:'1.775%'}
    ]}
];
let ccActive='nl';
let ccLoading=false;

function openCostCalculator_popup(){
  const el=document.getElementById('cost-calc-overlay');
  if(!el)return;
  el.classList.remove('hidden');
  renderCCTabs();
  renderCCContent(ccActive,false);
}
function closeCostCalculator(){
  const el=document.getElementById('cost-calc-overlay');
  if(el)el.classList.add('hidden');
}
function renderCCTabs(){
  const el=document.getElementById('cc-tabs');
  if(!el)return;
  el.innerHTML=ccCountries.map(c=>`<button class="cc-tab${c.id===ccActive?' active':''}" onclick="selectCCCountry('${c.id}')">${c.flag === 'NL' ? '&#127475;&#127473;' : c.flag === 'IN' ? '&#127470;&#127475;' : '&#127465;&#127466;'} ${c.name}</button>`).join('');
}
function selectCCCountry(id){
  if(ccLoading||id===ccActive)return;
  ccActive=id;
  renderCCTabs();
  renderCCContent(id,true);
}
function renderCCContent(id,animated){
  const loader=document.getElementById('cc-loader');
  const body=document.getElementById('cc-content');
  if(!loader||!body)return;
  if(animated){
    ccLoading=true;
    loader.classList.remove('hidden');
    body.classList.add('hidden');
    setTimeout(()=>{
      loader.classList.add('hidden');
      body.classList.remove('hidden');
      buildCCBody(id,body);
      ccLoading=false;
    },1800);
  }else{
    loader.classList.add('hidden');
    body.classList.remove('hidden');
    buildCCBody(id,body);
  }
}
function buildCCBody(id,el){
  const c=ccCountries.find(x=>x.id===id);
  if(!c)return;
  const total=c.items.reduce((a,b)=>a+b.val,0);
  const overhead=c.items.filter(x=>x.val!==c.salary).reduce((a,b)=>a+b.val,0);
  const overheadPct=Math.round((overhead/c.salary)*100);
  const fmt=v=>c.symbol+v.toLocaleString();
  el.innerHTML=`<div class="cc-summary"><div><div class="cc-summary-label">Estimated Annual Employer Cost</div><div class="cc-summary-val">${fmt(total)}</div><div class="cc-summary-note">${c.currency} &bull; All figures are estimates</div></div><div style="text-align:right"><div class="cc-summary-label">Base Salary</div><div style="font-size:20px;font-weight:700">${fmt(c.salary)}</div><div class="cc-summary-note">Overhead: +${overheadPct}% above salary</div></div></div><div class="cc-breakdown"><div class="cc-breakdown-title">Cost Breakdown</div>${c.items.map(item=>`<div class="cc-row"><div><div class="cc-row-label">${item.label}</div><div class="cc-row-note">${item.note}</div></div><div style="text-align:right"><div class="cc-row-val">${fmt(item.val)}</div>${item.pct?`<div class="cc-row-pct">${item.pct}</div>`:''}</div></div>`).join('')}<div class="cc-total-row"><span class="cc-total-label">Total Annual Cost to Employer</span><span class="cc-total-val">${fmt(total)}</span></div></div><div class="cc-disclaimer">Estimates based on standard rates from ADT Compliance Hub. Actual costs vary by salary band, contract type, and local regulations. Last updated: May 2026.</div>`;
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeCostCalculator();});/* Opened from an EOR/PEO listing, Back returns to that same listing - the
   sidebar-style navigatePage('contracts') would raise the type cards and lose
   the type the user was working in. */
let ccFromCtList=false;
function openCostCalculator(){ccFromCtList=page==='contracts'&&!ctLandingOpen;ccActiveCountry='nl';navigatePage('cost-calculator');}
function closeCostCalculatorPage(){navigatePage('contracts',ccFromCtList);}

/* ── COST CALCULATOR PAGE ──────────────────────────────────────────────
   Three states: 'empty' (nothing chosen yet) → 'loading' (rates being
   fetched) → 'ready' (results on screen). The page opens empty on purpose:
   no numbers are shown until the user has actually asked for them.
   Rates are per-country, against gross monthly salary. `flat` lines are
   fixed monthly amounts rather than a percentage of gross.               */
const ccPageData={
  nl:{name:'Netherlands',sym:'&#8364;',cur:'EUR',def:5000,min:2000,max:25000,step:100,updated:'Jul 2026',
    groups:[
      {key:'social',label:'Employer social security',items:[
        {label:'Unemployment insurance',note:'WW / Awf',rate:0.0274},
        {label:'Disability insurance',note:'WIA / WGA',rate:0.0627},
        {label:'Accident / return-to-work',note:'Whk differentiated premium',rate:0.0152},
        {label:'Childcare levy',note:'Wko',rate:0.0050},
        {label:'Health insurance',note:'Zvw employer levy',rate:0.0428}]},
      {key:'benefits',label:'Mandatory benefits',items:[
        {label:'Holiday allowance',note:'Vakantiegeld, accrued monthly, paid in May',rate:0.08}]}
    ]},
  in:{name:'India',sym:'&#8377;',cur:'INR',def:100000,min:20000,max:500000,step:5000,updated:'Jun 2026',
    groups:[
      {key:'social',label:'Employer social security',items:[
        {label:'Provident fund',note:'12% of basic salary',rate:0.06},
        {label:'Employee state insurance',note:'ESI, on wages up to threshold',rate:0.0325},
        {label:'Gratuity provision',note:'4.81% of basic salary',rate:0.0231}]},
      {key:'benefits',label:'Statutory levies',items:[
        {label:'Labour welfare fund & professional tax',note:'State levied, fixed amount',flat:200}]}
    ]},
  de:{name:'Germany',sym:'&#8364;',cur:'EUR',def:5000,min:1500,max:20000,step:100,updated:'Jul 2026',
    groups:[
      {key:'social',label:'Employer social security',items:[
        {label:'Pension insurance',note:'Rentenversicherung',rate:0.093},
        {label:'Unemployment insurance',note:'Arbeitslosenversicherung',rate:0.012},
        {label:'Health insurance',note:'Krankenversicherung',rate:0.073},
        {label:'Long-term care insurance',note:'Pflegeversicherung',rate:0.01775}]},
      {key:'benefits',label:'Mandatory benefits',items:[]}
    ]}
};
let ccActiveCountry='';      // nothing preselected — the user must choose
let ccSalary=0;
let ccState='empty';         // 'empty' | 'loading' | 'ready'
let ccTimers=[];

/* apCS deals in labels, the data is keyed by id, so the two are mapped here
   rather than inside the picker. The placeholder is also a real OPTION and not
   only the empty state: picking a country is how this page starts, and without
   it there is no way back to having picked none - the same reason the Contracts
   type filter carries its own 'All Types' row. */
const CC_ANY_COUNTRY='Select a country…';
function ccCountryIdByName(name){
  const keys=Object.keys(ccPageData);
  for(var i=0;i<keys.length;i++)if(ccPageData[keys[i]].name===name)return keys[i];
  return '';
}
function ccPickCountry(val){ccChangeCountry(val===CC_ANY_COUNTRY?'':ccCountryIdByName(val));}
function buildCostCalculatorPageHTML(){
  const ccCountryOpts=[CC_ANY_COUNTRY].concat(Object.keys(ccPageData).map(k=>ccPageData[k].name));
  const ccPicked=ccActiveCountry&&ccPageData[ccActiveCountry]?ccPageData[ccActiveCountry].name:'';
  return `<div class="ccp">
  <div class="ccp-topbar">
    <div class="ccp-topbar-l">
      <button class="ccp-back" onclick="closeCostCalculatorPage()" aria-label="Back to contracts"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="17" height="17"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
      <div>
        <div class="ccp-title">Cost calculator</div>
        <div class="ccp-sub">What an employee actually costs you, by country</div>
      </div>
    </div>
    <button class="btn-primary" id="cc-export" style="display:none" onclick="ccExportPDF()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export PDF</button>
  </div>

  <div class="ccp-body">

    <section class="ccp-card ccp-inputs">
      <div class="ccp-inputs-row">
        <div class="ccp-fld ccp-fld-country">
          <label class="ccp-lbl">Country of employment</label>
          ${apCS('cc-country',ccCountryOpts,ccPicked,CC_ANY_COUNTRY,'ccPickCountry')}
        </div>
        <div class="ccp-fld ccp-fld-salary off" id="cc-salary-fld">
          <label class="ccp-lbl" for="cc-salary">Gross monthly salary</label>
          <div class="ccp-money">
            <span class="ccp-money-sym" id="cc-sym">&mdash;</span>
            <input class="ccp-money-inp" id="cc-salary" type="text" inputmode="numeric" autocomplete="off" disabled
                   oninput="ccOnSalaryInput(this)" onblur="ccOnSalaryBlur(this)">
          </div>
        </div>
      </div>
      <div class="ccp-slider off" id="cc-slider-wrap">
        <input type="range" class="ccp-range" id="cc-range" aria-label="Gross monthly salary" disabled oninput="ccUpdateFromSlider(this.value)">
        <div class="ccp-scale"><span id="cc-min">&nbsp;</span><span id="cc-max">&nbsp;</span></div>
      </div>
      <div class="ccp-calc-row" id="cc-calc-row"></div>
    </section>

    <div id="cc-stage"></div>

    <section class="ccp-results" id="cc-results">
      <div class="ccp-result">
        <div class="ccp-result-top">
          <div>
            <div class="ccp-result-lbl">Total employer cost &middot; per month</div>
            <div class="ccp-result-val" id="cc-total"></div>
            <div class="ccp-result-note" id="cc-total-note"></div>
          </div>
          <div class="ccp-stats">
            <div>
              <div class="ccp-stat-lbl">Gross salary</div>
              <div class="ccp-stat-val" id="cc-stat-gross"></div>
              <div class="ccp-stat-sub">Paid to the employee</div>
            </div>
            <div>
              <div class="ccp-stat-lbl">Employer add-on</div>
              <div class="ccp-stat-val" id="cc-stat-add"></div>
              <div class="ccp-stat-sub" id="cc-stat-add-sub"></div>
            </div>
          </div>
        </div>
        <div class="ccp-bar" id="cc-bar"></div>
        <div class="ccp-legend" id="cc-legend"></div>
      </div>

      <div class="ccp-card">
        <div class="ccp-card-hdr">
          <div class="ccp-card-ttl">Cost breakdown</div>
          <div class="ccp-card-sub" id="cc-bd-sub"></div>
        </div>
        <table class="ccp-tbl">
          <thead><tr>
            <th>Cost line</th>
            <th class="r ccp-w-rate">Rate</th>
            <th class="r ccp-w-num">Monthly</th>
            <th class="r ccp-w-num">Annual</th>
          </tr></thead>
          <tbody id="cc-bd-body"></tbody>
        </table>
        <div class="ccp-foot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span id="cc-foot-txt"></span>
        </div>
      </div>
    </section>

  </div>
</div>`;
}

/* ── helpers ───────────────────────────────────────────────────────────── */
function ccFmt(v){const d=ccPageData[ccActiveCountry];return (d?d.sym:'')+'&nbsp;'+Math.round(v).toLocaleString('en-US');}
function ccSet(id,html){const el=document.getElementById(id);if(el)el.innerHTML=html;}
function ccEl(id){return document.getElementById(id);}
function ccClamp(v){const d=ccPageData[ccActiveCountry];if(!d)return v;return Math.max(d.min,Math.min(d.max,v));}
function ccClearTimers(){ccTimers.forEach(clearTimeout);ccTimers=[];}
function ccAfter(ms,fn){ccTimers.push(setTimeout(fn,ms));}

/* apCS builds its trigger from state at build time, and this page resets in
   place rather than re-rendering - so the label has to be put back by hand, the
   same three things csSelect() writes when a pick is made. */
function ccResetCountrySelect(){
  const trigger=document.querySelector('[data-csid="cc-country"]');
  if(trigger){
    const v=trigger.querySelector('.cs-value');
    if(v)v.textContent=CC_ANY_COUNTRY;
    trigger.classList.add('cs-placeholder');
    trigger.classList.remove('cs-open');
  }
  const drop=document.getElementById('csd-cc-country');
  if(drop){
    drop.classList.remove('cs-open');
    drop.querySelectorAll('.cs-option').forEach(function(o){o.classList.remove('cs-selected');});
  }
}
/* ── lifecycle ─────────────────────────────────────────────────────────── */
// The page always opens cold: no country, no salary, no numbers.
function initCostCalcPage(){
  ccClearTimers();
  ccState='empty';
  ccResetCountrySelect();
  ccChangeCountry('');   // single reset path: disables the fields, shows the empty state
}

/* The Calculate button is a gate for the *first* run, not a permanent control.
   Once results are on screen the whole form is live, so a button that merely
   recomputes what already updates itself would be dead weight — it is replaced
   by a live indicator that explains why no button is needed.                */
function ccSetCalcRow(mode){
  const gate=(label,hint,disabled)=>
    '<span class="ccp-hint">'+hint+'</span>'+
    '<button class="btn-primary" id="cc-run"'+(disabled?' disabled':'')+' onclick="ccRunEstimate()">'+
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8" y2="11"/><line x1="12" y1="11" x2="12" y2="11"/><line x1="16" y1="11" x2="16" y2="17"/><line x1="8" y1="17" x2="12" y2="17"/></svg>'+
    label+'</button>';
  const rows={
    locked: gate('Calculate cost','Select a country to begin',true),
    armed:  gate('Calculate cost','Set the salary, then run the estimate',false),
    busy:   '<button class="btn-primary" id="cc-run" disabled><span class="ccp-spin"></span>Calculating&hellip;</button>',
    live:   '<span class="ccp-live"><span class="ccp-live-dot"></span>Live estimate &mdash; the figures below follow this form as you change it</span>'
  };
  ccSet('cc-calc-row',rows[mode]);
}

function ccShowEmpty(){
  ccState='empty';
  const res=ccEl('cc-results');if(res)res.classList.remove('on');
  const exp=ccEl('cc-export');if(exp)exp.style.display='none';
  const tick='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>';
  ccSet('cc-stage',`<div class="ccp-empty">
    <div class="ccp-empty-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8" y2="11"/><line x1="12" y1="11" x2="12" y2="11"/><line x1="16" y1="11" x2="16" y2="11"/><line x1="8" y1="16" x2="12" y2="16"/></svg></div>
    <div>
      <div class="ccp-empty-ttl">Your estimate will appear here</div>
      <div class="ccp-empty-txt">Pick a country and a gross monthly salary above, then run the estimate.</div>
      <div class="ccp-empty-list">
        <span class="ccp-empty-li">${tick}Statutory employer contributions</span>
        <span class="ccp-empty-li">${tick}Mandatory benefits and levies</span>
        <span class="ccp-empty-li">${tick}Monthly and annual figures</span>
      </div>
    </div>
  </div>`);
}

/* ── input handling ────────────────────────────────────────────────────── */
function ccChangeCountry(id){
  ccClearTimers();
  ccActiveCountry=id;
  const fld=ccEl('cc-salary-fld'),wrap=ccEl('cc-slider-wrap'),inp=ccEl('cc-salary'),sl=ccEl('cc-range');

  if(!id){ // back to "Select a country…"
    ccSalary=0;
    if(fld)fld.classList.add('off');
    if(wrap)wrap.classList.add('off');
    if(inp){inp.disabled=true;inp.value='';}
    if(sl)sl.disabled=true;
    ccSet('cc-sym','&mdash;');ccSet('cc-min','&nbsp;');ccSet('cc-max','&nbsp;');
    ccSetCalcRow('locked');
    ccShowEmpty();
    return;
  }

  const d=ccPageData[id];
  ccSalary=d.def;
  if(fld)fld.classList.remove('off');
  if(wrap)wrap.classList.remove('off');
  if(inp){inp.disabled=false;inp.value=ccSalary.toLocaleString('en-US');}
  if(sl){sl.disabled=false;sl.min=d.min;sl.max=d.max;sl.step=d.step;sl.value=ccSalary;}
  ccSet('cc-sym',d.sym);ccSet('cc-min',ccFmt(d.min));ccSet('cc-max',ccFmt(d.max));
  ccSyncSlider();

  // Rates differ per country, so an existing result is no longer valid:
  // re-run the lookup rather than leaving stale numbers on screen.
  if(ccState==='ready'||ccState==='loading'){ccRunEstimate();}
  else{ccSetCalcRow('armed');}
}

function ccUpdateFromSlider(v){
  ccSalary=parseInt(v,10);
  const inp=ccEl('cc-salary');if(inp)inp.value=ccSalary.toLocaleString('en-US');
  ccSyncSlider();
  ccLiveUpdate();
}
// While typing we keep the raw digits so the caret never jumps; the value is
// only clamped and re-formatted once the field loses focus.
function ccOnSalaryInput(el){
  const digits=el.value.replace(/[^0-9]/g,'');
  el.value=digits;
  ccSalary=parseInt(digits,10)||0;
  const sl=ccEl('cc-range');if(sl)sl.value=ccClamp(ccSalary);
  ccSyncSlider();
  ccLiveUpdate();
}
function ccOnSalaryBlur(el){
  if(!ccActiveCountry)return;
  ccSalary=ccClamp(parseInt(el.value.replace(/[^0-9]/g,''),10)||ccPageData[ccActiveCountry].def);
  el.value=ccSalary.toLocaleString('en-US');
  const sl=ccEl('cc-range');if(sl)sl.value=ccSalary;
  ccSyncSlider();
  ccLiveUpdate();
}
// Once an estimate is on screen the slider stays live — re-pressing Calculate
// for every drag would be busywork. Only a country switch re-fetches rates.
function ccLiveUpdate(){if(ccState==='ready')ccRender(false);}

function ccSyncSlider(){
  const sl=ccEl('cc-range'),d=ccPageData[ccActiveCountry];
  if(!sl||!d)return;
  sl.style.setProperty('--fill',((ccClamp(ccSalary)-d.min)/(d.max-d.min))*100+'%');
}

/* ── the estimate run: loader, then reveal ─────────────────────────────── */
const ccSteps=[
  {t:'Connecting to Compliance Hub',p:18},
  {t:'Fetching statutory rates',p:58},
  {t:'Calculating employer cost',p:88}
];
function ccRunEstimate(){
  if(!ccActiveCountry)return;
  ccClearTimers();
  ccState='loading';

  const res=ccEl('cc-results');if(res)res.classList.remove('on');
  const exp=ccEl('cc-export');if(exp)exp.style.display='none';
  ccSetCalcRow('busy');

  ccSet('cc-stage',`<div class="ccp-loading">
    <div class="ccp-ring"></div>
    <div class="ccp-step" id="cc-step">${ccSteps[0].t}<span class="ccp-step-dots"><span>.</span><span>.</span><span>.</span></span></div>
    <div class="ccp-progress"><i id="cc-prog"></i></div>
  </div>`);
  const prog=ccEl('cc-prog');
  if(prog)requestAnimationFrame(()=>{prog.style.width=ccSteps[0].p+'%';});

  ccSteps.slice(1).forEach((s,i)=>{
    ccAfter(520*(i+1),()=>{
      ccSet('cc-step',s.t+'<span class="ccp-step-dots"><span>.</span><span>.</span><span>.</span></span>');
      const p=ccEl('cc-prog');if(p)p.style.width=s.p+'%';
    });
  });

  ccAfter(1560,()=>{
    const p=ccEl('cc-prog');if(p)p.style.width='100%';
    ccState='ready';
    ccSet('cc-stage','');
    if(res)res.classList.add('on');
    if(exp)exp.style.display='';
    ccSetCalcRow('live');
    ccRender(true);
  });
}

/* ── calculation ───────────────────────────────────────────────────────── */
// Every line is rounded first and the totals are summed from the rounded
// lines, so what the user reads down the column always adds up.
function ccCompute(){
  const d=ccPageData[ccActiveCountry],s=Math.max(0,ccSalary);
  const groups=d.groups
    .map(g=>{
      const items=g.items.map(i=>({...i,amt:i.flat!=null?i.flat:Math.round(s*i.rate)}));
      return {label:g.label,key:g.key,items:items,total:items.reduce((a,b)=>a+b.amt,0)};
    })
    .filter(g=>g.items.length);
  const addOn=groups.reduce((a,g)=>a+g.total,0);
  return {d:d,s:s,groups:groups,addOn:addOn,total:s+addOn};
}

// Counts the headline figure up on a fresh reveal; live slider edits just set
// it, because a counter re-firing on every drag frame reads as jitter.
function ccCountUp(id,to){
  const el=ccEl(id);if(!el)return;
  const dur=650,t0=Date.now();
  const tick=()=>{
    if(ccState!=='ready')return;
    const k=Math.min(1,(Date.now()-t0)/dur);
    const e=1-Math.pow(1-k,3);
    el.innerHTML=ccFmt(to*e);
    if(k<1)requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function ccRender(reveal){
  if(!ccActiveCountry)return;
  const c=ccCompute(),s=c.s,total=c.total;
  const pct=s>0?(c.addOn/s*100):0;
  const mult=s>0?(total/s):0;

  if(reveal)ccCountUp('cc-total',total); else ccSet('cc-total',ccFmt(total));
  ccSet('cc-total-note',ccFmt(total*12)+' per year &middot; '+mult.toFixed(2)+'&times; the gross salary');
  ccSet('cc-stat-gross',ccFmt(s));
  ccSet('cc-stat-add','+ '+ccFmt(c.addOn));
  ccSet('cc-stat-add-sub',pct.toFixed(1)+'% on top of gross');
  ccSet('cc-bd-sub','Gross monthly salary of '+ccFmt(s)+' in '+c.d.name+', with employer contributions shown monthly and annualised.');
  ccSet('cc-foot-txt','Rates sourced live from the Compliance Hub &middot; '+c.d.name+' verified '+c.d.updated+'. Estimates only — actual cost varies with salary band, contract type and local rules.');

  // composition bar + legend (segments start at 0 and widen on the next frame)
  const seg=v=>total>0?(v/total*100):0;
  const cls=['g','s','b'];
  const widths=[seg(s)];
  let bar='<div class="ccp-seg g"></div>';
  let legend='<span class="ccp-lg"><span class="ccp-dot g"></span>Gross salary '+ccFmt(s)+'</span>';
  c.groups.forEach((g,i)=>{
    const k=cls[Math.min(i+1,2)];
    widths.push(seg(g.total));
    bar+='<div class="ccp-seg '+k+'"></div>';
    legend+='<span class="ccp-lg"><span class="ccp-dot '+k+'"></span>'+g.label+' '+ccFmt(g.total)+'</span>';
  });
  ccSet('cc-bar',bar);
  ccSet('cc-legend',legend);
  const barEl=ccEl('cc-bar');
  if(barEl){
    const paint=()=>Array.prototype.forEach.call(barEl.children,(el,i)=>{el.style.width=widths[i]+'%';});
    reveal?requestAnimationFrame(()=>requestAnimationFrame(paint)):paint();
  }

  // breakdown table
  let rows='<tr class="ccp-r-base"><td>Gross salary<span class="sub">Paid to the employee</span></td>'+
           '<td class="r rate">&mdash;</td><td class="r num">'+ccFmt(s)+'</td><td class="r num">'+ccFmt(s*12)+'</td></tr>';
  c.groups.forEach(g=>{
    // A one-line group would repeat its own subtotal, so the header stays bare.
    const gPct=s>0?(g.total/s*100):0;
    const single=g.items.length===1;
    rows+='<tr class="ccp-r-grp"><td>'+g.label+'</td>'+
          (single?'<td></td><td></td><td></td>'
                 :'<td class="r">'+gPct.toFixed(2)+'%</td><td class="r num">'+ccFmt(g.total)+'</td><td class="r num">'+ccFmt(g.total*12)+'</td>')+
          '</tr>';
    g.items.forEach(i=>{
      rows+='<tr class="ccp-r-item"><td class="line">'+i.label+(i.note?'<span class="sub">'+i.note+'</span>':'')+'</td>'+
            '<td class="r rate">'+(i.flat!=null?'Fixed':(i.rate*100).toFixed(2)+'%')+'</td>'+
            '<td class="r num">'+ccFmt(i.amt)+'</td><td class="r num">'+ccFmt(i.amt*12)+'</td></tr>';
    });
  });
  rows+='<tr class="ccp-r-total"><td>Total employer cost</td><td class="r">'+(pct?'+'+pct.toFixed(1)+'%':'&mdash;')+'</td>'+
        '<td class="r num">'+ccFmt(total)+'</td><td class="r num">'+ccFmt(total*12)+'</td></tr>';
  ccSet('cc-bd-body',rows);

  // stagger the rows in on a fresh reveal only
  const body=ccEl('cc-bd-body');
  if(body)Array.prototype.forEach.call(body.children,(tr,i)=>{tr.style.animationDelay=reveal?(0.13+i*0.035)+'s':'0s';});
}

function ccExportPDF(){
  if(ccState!=='ready')return;
  const c=ccCompute();
  showToast('Cost estimate exported','success',c.d.name+' &middot; '+ccFmt(c.total)+' per employee, per month');
}
// == SEARCH OVERLAY ==
/* ── COMMAND PALETTE ───────────────────────────────────────────────────────
   Ctrl/Cmd-K. This used to be a blind box: you typed, pressed Enter, and a
   chain of substring tests either navigated somewhere or did nothing at all,
   silently. You could not see what it knew, so the only way to use it was to
   already know the phrase it wanted.

   It is now a list you can read. Every destination in the rail and every
   create action in the product is in PALETTE_ITEMS, filtered as you type and
   driven with the arrow keys. Two consequences worth keeping:

     1. It is the shortest path to anything. Two keystrokes reaches any of
        ~40 destinations, and reaches CREATE actions that otherwise need a
        navigate-then-click - so "apply for leave" is Cmd-K, "lea", Enter
        from anywhere in the app.
     2. It doubles as the product's index. A user who does not know a feature
        exists finds it by typing a word close to it, which no amount of
        rail nesting achieves.

   Some entries pre-set a filter before navigating ("Pending leave requests").
   That is the same two-clicks-to-the-work idea as the row quick actions: land
   on the queue, not on the page that contains the queue.               */
var PALETTE_EXTRA=[
  /* Filtered destinations - land on the work, not on the page. */
  {label:'Pending leave requests',group:'Queues',keys:'leave approve pending queue',run:function(){alStatusFilter='Pending';navigatePage('all-leaves');}},
  {label:'Unpaid invoices',group:'Queues',keys:'payment invoice unpaid due money',run:function(){pmInvoiceStatusFilter='Unpaid';navigatePage('payments');}},
  {label:'Pending payroll',group:'Queues',keys:'pay run cycle pending',run:function(){listStatusFilters.payroll='Pending';navigatePage('payroll');}},
  {label:'Open tickets',group:'Queues',keys:'support ticket open issue',run:function(){tkQuickStatusFilter='open';navigatePage('support-tickets');}},
  {label:'Inactive employees',group:'Queues',keys:'people staff inactive offboard',run:function(){geStatusFilter='Inactive';empSubTab='global';navigatePage('employees');}},

  /* Create actions - each one is a click that otherwise needs a page first. */
  {label:'Create a contract',group:'Create',keys:'new contract eor peo hire',run:function(){navigatePage('contracts');addListingItem('contracts');}},
  {label:'Add an employee',group:'Create',keys:'new employee people hire staff',run:function(){navigatePage('employees');addListingItem('employees');}},
  {label:'Apply for leave',group:'Create',keys:'new leave request holiday time off',run:function(){navigatePage('all-leaves');startAddLeave();}},
  {label:'Add a leave policy',group:'Create',keys:'new leave policy rule entitlement',run:function(){navigatePage('leave-policies');startAddLeavePolicy();}},
  {label:'Create an announcement',group:'Create',keys:'new announcement notice broadcast post news update employees',run:function(){navigatePage('announcements');anmStartCreate();}},
  {label:'Add holidays',group:'Create',keys:'new holiday holidays calendar public festival entity day off',run:function(){navigatePage('holidays');startAddHoliday();}},
  {label:'Create a team',group:'Create',keys:'new team group department',run:function(){startAddTeam();}},
  {label:'Add a compliance requirement',group:'Create',keys:'new compliance requirement item',run:function(){navigatePage('compliance');complianceModalOpen=true;renderADTPage();}},
  {label:'Add a rate or rule',group:'Create',keys:'new rate rule tax statutory',run:function(){navigatePage('rates-rules');ratesRuleModalOpen=true;renderADTPage();}},
  {label:'Add a contract template',group:'Create',keys:'new template contract document',run:function(){navigatePage('contract-templates');ctpModalOpen=true;renderADTPage();}},

  /* Tools. */
  {label:'Cost calculator',group:'Tools',keys:'cost calculator salary employer estimate',run:function(){navigatePage('cost-calculator');}},
  {label:'Switch entity',group:'Tools',keys:'switch entity company change org',run:function(){navigatePage('switch-entity');}}
];

/* Destinations come from the rail itself, so a nav item added there shows up
   here without anyone remembering to also add it. */
function paletteItems(){
  var items=[];
  var seen={};
  (typeof getSidebarItems==='function'?getSidebarItems():[]).forEach(function(item){
    if(item.section)return;
    var list=item.dropdown?(item.children||[]):[item];
    list.forEach(function(c){
      if(!c.id||c.placeholder||seen[c.id])return;
      seen[c.id]=1;
      items.push({
        label:c.label||c.id,
        group:item.dropdown||'Go to',
        keys:(c.label||'')+' '+(item.dropdown||''),
        pg:c.id
      });
    });
  });
  return items.concat(PALETTE_EXTRA);
}

var paletteMatches=[],paletteIndex=0;

function openSearch(){
  var ov=document.getElementById('search-overlay');
  if(!ov)return;
  ov.classList.add('open');
  var inp=document.getElementById('search-input');
  if(inp){inp.value='';inp.placeholder='Search pages and actions…';setTimeout(function(){inp.focus();},80);}
  var clr=document.getElementById('search-clear-btn');
  if(clr)clr.classList.remove('visible');
  buildPaletteResults('');
}
function closeSearch(){
  var ov=document.getElementById('search-overlay');
  if(ov)ov.classList.remove('open');
}
function clearSearch(){
  var inp=document.getElementById('search-input');
  if(inp){inp.value='';inp.focus();}
  var clr=document.getElementById('search-clear-btn');
  if(clr)clr.classList.remove('visible');
  buildPaletteResults('');
}
function onSearchInput(inp){
  var clr=document.getElementById('search-clear-btn');
  if(clr)clr.classList.toggle('visible',inp.value.length>0);
  buildPaletteResults(inp.value);
}
function fillSearch(text){
  var inp=document.getElementById('search-input');
  if(inp){inp.value=text;inp.focus();onSearchInput(inp);}
}

/* Ranking: a prefix match beats a word-start match beats a match anywhere.
   Without this "lea" surfaces "Global Employee" (…emp*lo*yee) above "Leaves",
   which is the kind of result that teaches people not to trust the box. */
function paletteScore(item,q){
  if(!q)return 0;
  var label=item.label.toLowerCase();
  var keys=(item.label+' '+(item.keys||'')+' '+(item.group||'')).toLowerCase();
  if(label.indexOf(q)===0)return 100;
  if((' '+label).indexOf(' '+q)>=0)return 80;
  if(label.indexOf(q)>=0)return 60;
  if((' '+keys).indexOf(' '+q)>=0)return 40;
  if(keys.indexOf(q)>=0)return 20;
  return -1;
}

function buildPaletteResults(query){
  var box=document.getElementById('search-results');
  if(!box)return;
  var q=String(query||'').trim().toLowerCase();
  var scored=[];
  paletteItems().forEach(function(it){
    var s=paletteScore(it,q);
    if(q&&s<0)return;
    scored.push({it:it,s:s});
  });
  scored.sort(function(a,b){return b.s-a.s;});
  paletteMatches=scored.slice(0,q?12:9).map(function(x){return x.it;});
  paletteIndex=0;

  if(!paletteMatches.length){
    box.innerHTML='<div class="search-empty">Nothing matches “'+String(query).replace(/</g,'&lt;')+'”</div>';
    return;
  }
  var lastGroup='',html='';
  paletteMatches.forEach(function(it,i){
    var g=it.group||'Go to';
    if(g!==lastGroup){html+='<div class="search-group">'+g+'</div>';lastGroup=g;}
    html+='<button type="button" class="search-result'+(i===0?' active':'')+'" data-i="'+i+'" onclick="runPalette('+i+')">'
      +'<span class="search-result-label">'+it.label+'</span>'
      +'<span class="search-result-kind">'+(it.pg?'Open':'Run')+'</span>'
      +'</button>';
  });
  box.innerHTML=html;
}

function movePalette(delta){
  if(!paletteMatches.length)return;
  paletteIndex=(paletteIndex+delta+paletteMatches.length)%paletteMatches.length;
  var box=document.getElementById('search-results');
  if(!box)return;
  var all=box.querySelectorAll('.search-result');
  all.forEach(function(el,i){el.classList.toggle('active',i===paletteIndex);});
  var active=all[paletteIndex];
  if(active)active.scrollIntoView({block:'nearest'});
}

function runPalette(i){
  var it=paletteMatches[i==null?paletteIndex:i];
  if(!it)return;
  closeSearch();
  if(it.pg){if(typeof activeSidebarItem!=='undefined')activeSidebarItem=it.pg;navigatePage(it.pg);}
  else if(it.run)it.run();
}
/* Kept as the public name the topbar and any older call sites use. */
function executeSearch(text){
  if(text){fillSearch(text);return;}
  runPalette();
}
function onSearchKeydown(e){
  if(e.key==='ArrowDown'){e.preventDefault();movePalette(1);return;}
  if(e.key==='ArrowUp'){e.preventDefault();movePalette(-1);return;}
  if(e.key==='Enter'){e.preventDefault();runPalette();return;}
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closeSearch();}
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openSearch();}
});
/* ══ ATTENDANCE CLOCK ═══════════════════════════════════════════════════════
   Clocking in is the only thing on the employee dashboard the user DOES, so it
   is the only thing that gets a real piece of motion. The card runs a small
   state machine and the CSS in main.css owns every duration and easing — this
   file starts and ends the phases and nothing else. Nothing here reads a
   computed style or animates a property by hand.

     idle ──clock in──▶ [ stage ] ──▶ in ──clock out──▶ [ stage ] ──▶ done
       ▲                                                              │
       └──────────────── clock in again (same day) ◀──────────────────┘

   THE CARD NEVER RESIZES AND NEVER DOUBLE-FIRES. `_attBusy` gates the button
   for the length of the sequence: a second click mid-animation would otherwise
   start a punch from a state the card has not finished arriving at, and the
   two runs would fight over the same hand angles.

   TOTAL FOR THE DAY IS ACCUMULATED, NOT READ OFF THE LAST SESSION. Somebody
   who clocks out for lunch and back in has two sessions and one total, so the
   figure the card reports after a clock-out is every session so far today —
   which is also why it is stamped with the date and reset when that rolls. */
var _attState='idle';          // idle | in | done
var _attBusy=false;            // a sequence is running; the button is inert
var _attTimer=null;            // the live 1s tick while clocked in
var _attInAt=null;             // Date of the current clock-in
var _attOutAt=null;            // Date of the last clock-out
var _attDaySecs=0;             // seconds banked from completed sessions today
var _attDayKey=_attToday();
var _attPlace='Hyderabad';     // last location shown, kept so a re-mount can restate it
var _attPlacePending=false;    // ...and whether it was still being resolved

function _attToday(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function _attEl(id){return document.getElementById(id);}
function _attCard(){return _attEl('att-card');}
// Every duration in the choreography, in one place, so the JS phases and the
// CSS keyframes can be read against each other.
// Mirrors the --att-t-* block in main.css. Slower than the first pass by ~40%:
// the hands now have room to decelerate instead of stopping dead.
var ATT_T={dial:950,hands:1900,roll:820,seal:1980,hold:2500,settle:340,close:560};
function _attReduced(){
  return window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
}
function _attFmtTime(d){
  return d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
}
// "07h 24m" while it matters, "07h 24m 13s" while it is still running — the
// seconds are only interesting on a clock the user is watching tick.
function _attFmtDur(secs,withSecs){
  var h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60),s=secs%60;
  var p=function(n){return String(n).padStart(2,'0');};
  return p(h)+'h '+p(m)+'m'+(withSecs?' '+p(s)+'s':'');
}
function _attSay(msg){var l=_attEl('att-live');if(l)l.textContent=msg;}

/* The hands are given "spins + final angle" as one number so the wind-down and
   the landing are a single animation. Winding FORWARD for a clock-in and
   BACKWARD for a clock-out is the whole read of the gesture: time being put on
   the record, then taken off it. */
function _attSetHands(from,to,spins){
  var card=_attCard();if(!card)return;
  var ang=function(d){
    var mins=d.getHours()%12*60+d.getMinutes();
    return {h:mins/720*360,m:d.getMinutes()/60*360};
  };
  var a=from?ang(from):{h:0,m:0},b=ang(to);
  card.style.setProperty('--h-from',a.h+'deg');
  card.style.setProperty('--m-from',a.m+'deg');
  card.style.setProperty('--h-deg',(b.h+360*spins)+'deg');
  card.style.setProperty('--m-deg',(b.m+360*spins*3)+'deg');
}

/* The digital readout rolls up to the punch time rather than appearing at it.
   It counts in MINUTES-SINCE-MIDNIGHT, so the roll passes through real clock
   readings the whole way up instead of scrambling digits — the difference
   between a counter arriving somewhere and a slot machine stopping. */
function _attRollTime(target,done){
  var el=_attEl('att-stage-time');if(!el){if(done)done();return;}
  var end=target.getHours()*60+target.getMinutes();
  if(_attReduced()){el.textContent=_attFmtTime(target);if(done)done();return;}
  var start=Math.max(0,end-95),t0=null;
  var frame=function(ts){
    if(t0===null)t0=ts;
    var p=Math.min(1,(ts-t0)/ATT_T.roll);
    var eased=1-Math.pow(1-p,4);                 // ease-out quart — softer landing,
                                                 // paired with --att-ease in CSS
    var mins=Math.round(start+(end-start)*eased);
    var d=new Date(target);d.setHours(Math.floor(mins/60),mins%60,0,0);
    el.textContent=_attFmtTime(d);
    if(p<1)requestAnimationFrame(frame);
    else{el.textContent=_attFmtTime(target);if(done)done();}
  };
  requestAnimationFrame(frame);
}

// One place that decides what the resting card says, for all three states —
// so a state can never be half-applied by whichever handler ran last.
function _attPaint(){
  var card=_attCard();if(!card)return;
  card.classList.remove('is-idle','is-in','is-done');
  card.classList.add(_attState==='in'?'is-in':_attState==='done'?'is-done':'is-idle');
  _attEl('att-clockin-time').textContent=_attInAt?_attFmtTime(_attInAt):'--:-- --';
  // The span summary carries both times once the shift has closed.
  var inTxt=_attInAt?_attFmtTime(_attInAt):'--:-- --';
  _attEl('att-span-in').textContent=inTxt;
  _attEl('att-span-out').textContent=_attOutAt?_attFmtTime(_attOutAt):'--:-- --';
  var btn=_attEl('att-clock-btn');
  btn.textContent=_attState==='in'?'Clock Out':'Clock In';
  btn.disabled=_attBusy;
  _attTickLogged();
}
/* The day's total, as a readout rather than a sentence. It used to be one 11px
   grey line that read like a footnote — but while the clock is running it is
   the live figure on the card and the only thing on it that is changing, so it
   is set as a figure: a quiet label over big tabular digits, with the h/m/s
   letters dropped back so the numbers read as numbers.

   Units are marked up separately for that reason alone. Building the string
   here rather than in CSS keeps the tick to one innerHTML write a second. */
function _attSeg(n,unit){
  return '<span class="att-seg">'+String(n).padStart(2,'0')+'<i>'+unit+'</i></span>';
}
function _attTickLogged(){
  var el=_attEl('att-logged-time');if(!el)return;
  var live=_attState==='in'&&_attInAt
    ? Math.floor((Date.now()-_attInAt.getTime())/1000) : 0;
  var total=_attDaySecs+live;
  var h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  // Seconds only while there is a clock running to watch — on a settled total
  // they are noise, and they would invite the eye to a number that never moves.
  var running=_attState==='in';
  var val=_attSeg(h,'h')+_attSeg(m,'m')+(running?_attSeg(s,'s'):'');
  var label=_attState==='done'?'Total logged today'
           :_attState==='in'?'Logged today'
           :'Not clocked in yet';
  el.innerHTML='<span class="att-logged-label"><span class="att-live-dot"></span>'+label+'</span>'
    +'<span class="att-logged-val">'+val+'</span>';
}

/* ── Surviving a navigation ────────────────────────────────────────────────
   THE CARD IS MARKUP; THE SHIFT IS NOT. #adt-content is re-injected from a
   snapshot of the original dashboard HTML every time you come back to it
   (dashboardContentHTML, taken once at load), and that snapshot is by
   definition the IDLE card: is-idle, "Clock In", "--:-- --".

   So clocking in and stepping into another module used to hand back a card
   that said nobody was clocked in — while _attState still said 'in' and the
   one-second tick, which looks its element up by id every time, went on
   writing a running total into it. A running timer under a Clock In button is
   the card contradicting itself, and clicking that button would have started a
   SECOND clock-in over a shift that was already open.

   The state was never wrong; it just stopped being on screen. Every mount of
   the dashboard now ends here, and the card is told what it is again. */
function _attRestore(){
  if(!_attCard())return;                  // not the dashboard - nothing to restore onto
  // A shift left open across midnight is not today's shift. Same rule the
  // button applies, applied here too, so the roll cannot be missed by simply
  // not clicking anything.
  if(_attDayKey!==_attToday()){
    _attDayKey=_attToday();_attDaySecs=0;_attInAt=_attOutAt=null;_attState='idle';
  }
  _attSetLocation(_attPlace,_attPlacePending);
  _attPaint();
  // One tick at a time, and only while a clock is actually running: the old
  // interval outlives the element it was writing into.
  clearInterval(_attTimer);_attTimer=null;
  if(_attState==='in')_attTimer=setInterval(_attTickLogged,1000);
}

/* ── Location, and why the punch waits on it ───────────────────────────────
   Attendance recorded without a location is attendance nobody can audit, so
   location is a PRECONDITION of clocking in, not a decoration on it. That has
   three consequences the code has to honour:

     · The stage stays up while the browser asks. The user is looking at a
       permission dialog; the card behind it must not have quietly finished.
     · A refusal ABORTS. No clock-in is recorded, the card returns to idle, and
       it says why — a punch the user did not agree to the terms of is worse
       than no punch.
     · Only the DECISION gates it. The reverse-geocode that turns coordinates
       into a place name is a nicety and lands afterwards; nothing waits on the
       network for it.

   TWO THINGS DECIDE WHETHER CHROME EVER SHOWS ITS PROMPT, and the first pass
   got both wrong:
     1. ASK DIRECTLY. Gating on permissions.query()==='granted' means the
        prompt can never appear — the state is 'prompt' until something
        prompts. getCurrentPosition IS the prompt.
     2. ASK INSIDE THE CLICK, synchronously, so the browser attributes the
        request to the gesture.

   And one thing decides whether it can work at all: geolocation needs a secure
   context. Served over https or from localhost it prompts; opened as a file://
   page off disk, Chrome blocks the API outright — so clock-in is unavailable
   and the card says so rather than failing silently. */
var ATT_OFFICE='Hyderabad';
/* NOTHING TIMES OUT WHILE THE PROMPT IS OPEN. Two clocks were cutting the wait
   short and both are wrong for the same reason: the browser's `timeout` option
   starts the moment the request is made and keeps running the whole time the
   permission dialog is on screen, so a user reading the dialog for ten seconds
   was being told their location request had failed. The dialog is not a
   failure — it is the thing we are waiting for.

   So the two waits are separated. Until the user answers, there is NO limit at
   all: getCurrentPosition is called with no `timeout`, which the spec defines
   as Infinity, and the stage sits on "Waiting for location" for as long as it
   takes. Only once permission is actually GRANTED does a cap start, and it
   caps the thing it should — acquiring a fix from the hardware, which really
   can fail. permissions.onchange is what tells the two apart.

   And there is a Cancel on the waiting state, so a user who changes their mind
   never needs a timer to rescue them. */
var ATT_FIX_CAP=25000;      // applies ONLY after permission is granted
var _attLoc={state:'idle',reason:'',waiters:[]};
var _attGate=null;              // the punch currently held at the location gate

function _attSetLocation(text,pending){
  _attPlace=text;_attPlacePending=!!pending;   // state, so a re-mounted card can be told again
  var el=_attEl('att-location');if(el){
    el.textContent=text;
    el.classList.toggle('is-pending',!!pending);
  }
  // The stage caption is the same fact, so it is written from the same place
  // rather than polled — the two cannot drift apart.
  var card=_attCard(),sub=_attEl('att-stage-sub');
  if(sub&&card&&card.classList.contains('is-busy')&&!card.classList.contains('is-waiting'))
    sub.textContent=text;
}
/* `kind` says WHICH refusal this was. A permission or hardware failure and a
   punch from outside the fence end the same way — nothing recorded — but they
   need different headlines and a different way out, so the stage asks. */
function _attLocDone(ok,reason,kind){
  if(_attLoc.state!=='pending')return;       // first outcome wins
  _attLoc.state=ok?'ok':'fail';_attLoc.reason=reason||'';_attLoc.kind=kind||'';
  var w=_attLoc.waiters;_attLoc.waiters=[];
  w.forEach(function(fn){fn(ok,reason||'',kind||'');});
}
// Hand back the decision — now if it is already in, later if it is not.
function _attLocAwait(cb){
  if(_attLoc.state==='pending')_attLoc.waiters.push(cb);
  else cb(_attLoc.state==='ok',_attLoc.reason,_attLoc.kind||'');
}

/* The company's Attendance tab is the authority on both questions. Read live
   on every punch, so a setting saved a minute ago applies to the next click —
   and defaulted to ON if the settings module is absent, because silently not
   checking is the failure that would go unnoticed. */
function _attGeoOn(){
  return typeof csAtt==='undefined'||csAtt.geolocation!==false;
}
/* Not a setting of its own: with geolocation on, the office radius always
   applies — as long as there is an Active branch to measure against. An
   Inactive branch is one nobody is meant to be clocking in at. */
function _attOffices(){
  if(typeof csAtt==='undefined'||!csAtt.locations)return [];
  return csAtt.locations.filter(function(L){return (L.status||'Active')==='Active';});
}
function _attFenceOn(){
  return _attGeoOn()&&_attOffices().length>0;
}
// Great-circle distance in metres — accurate to well under a metre at the
// scale of an office radius.
function _attDistM(lat1,lng1,lat2,lng2){
  var R=6371000,r=Math.PI/180;
  var dLat=(lat2-lat1)*r,dLng=(lng2-lng1)*r;
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)
       +Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return 2*R*Math.asin(Math.min(1,Math.sqrt(a)));
}
/* Null when the punch is inside ANY office's radius, otherwise the nearest
   office — the one worth naming, since it is the one the user most likely
   meant to be at. */
function _attFenceMiss(lat,lng){
  var best=null,offices=_attOffices();
  for(var i=0;i<offices.length;i++){
    var L=offices[i],d=_attDistM(lat,lng,+L.lat,+L.lng),rad=+L.radius||100;
    if(d<=rad)return null;
    if(!best||d-rad<best.over)best={name:L.name||'the office',dist:d,radius:rad,over:d-rad};
  }
  return best;
}
function _attFmtDist(m){
  return m>=1000?(m/1000).toFixed(m>=10000?0:1)+' km':Math.round(m)+' m';
}

function _attRequestLocation(){
  _attLoc={state:'pending',reason:'',waiters:[]};
  if(!navigator.geolocation){
    _attSetLocation('Unavailable');
    _attLocDone(false,'This browser cannot report a location.');return;
  }
  if(window.isSecureContext===false){
    _attSetLocation('Unavailable');
    _attLocDone(false,'Location needs the app served over https or localhost, not opened as a file.');
    return;
  }
  _attSetLocation('Locating…',true);
  // No `timeout` key — the spec's default is Infinity, so this sits on the
  // permission prompt indefinitely. The cap is armed by _attWatchPermission
  // once the user has actually said yes.
  navigator.geolocation.getCurrentPosition(function(p){
    var lat=p.coords.latitude,lng=p.coords.longitude;
    _attSetLocation(lat.toFixed(4)+', '+lng.toFixed(4));
    var miss=_attFenceOn()?_attFenceMiss(lat,lng):null;
    if(miss)_attLocDone(false,'You are '+_attFmtDist(miss.dist)+' from '+miss.name
      +'. Clock in from the office, or request a manual entry for approval.','fence');
    else _attLocDone(true);
    _attNameLocation(lat,lng);               // refinement only — nothing waits on it
  },function(err){
    _attSetLocation('Unavailable');
    _attLocDone(false,err&&err.code===1
      ? 'Location access was denied. Allow it to clock in.'
      : 'Your location could not be determined. Check that location is on for this device.');
  },{enableHighAccuracy:true,maximumAge:60000});
  _attWatchPermission();
}

/* Tells the "user has not answered yet" wait apart from the "device is trying
   to get a fix" wait — the only reason a cap can be applied to the second
   without also punishing the first. Where permissions is unavailable there is
   simply no cap, and the Cancel button on the waiting state is the way out. */
function _attWatchPermission(){
  if(!navigator.permissions||!navigator.permissions.query)return;
  var token=_attLoc;                          // the request this watcher belongs to
  navigator.permissions.query({name:'geolocation'}).then(function(st){
    var armed=false;
    var arm=function(){
      if(armed||st.state!=='granted')return;
      armed=true;
      setTimeout(function(){
        if(_attLoc!==token)return;            // a newer request has replaced this one
        _attLocDone(false,'Your location could not be determined. Check that location is on for this device.');
      },ATT_FIX_CAP);
    };
    arm();                                    // already granted: cap from now
    st.onchange=function(){
      if(_attLoc!==token)return;
      if(st.state==='denied')_attLocDone(false,'Location access was denied. Allow it to clock in.');
      else arm();
    };
  }).catch(function(){});
}

/* Coordinates are correct and unreadable, so they are traded for a place name
   when one can be had. Capped at 4s and silently abandoned on any failure —
   the field already holds a true value before this is called. */
function _attNameLocation(lat,lng){
  if(typeof fetch!=='function'||typeof AbortController!=='function')return;
  var ctl=new AbortController();
  var bail=setTimeout(function(){ctl.abort();},4000);
  fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude='
        +lat+'&longitude='+lng+'&localityLanguage=en',{signal:ctl.signal})
    .then(function(r){return r.ok?r.json():null;})
    .then(function(d){
      clearTimeout(bail);
      var place=d&&(d.city||d.locality||d.principalSubdivision);
      if(place)_attSetLocation(place);
    })
    .catch(function(){clearTimeout(bail);});
}

/* Run the stage once. `opts` is the whole difference between a clock-in and a
   clock-out — same choreography, different direction, colour and copy — plus
   `gated`, which is what makes a clock-in wait on the location decision and a
   clock-out not. `commit` runs only if the gate passes. */
function _attRunStage(opts,commit){
  var card=_attCard();if(!card){commit();return;}
  _attBusy=true;
  var btn=_attEl('att-clock-btn');if(btn)btn.disabled=true;
  var fast=_attReduced();

  card.classList.remove('is-sealed','is-waiting','is-denied','is-resolving');
  var copy=_attEl('att-stage-copy');if(copy)copy.classList.remove('is-recopy');
  card.classList.toggle('is-out',!!opts.out);
  _attEl('att-stage-label').textContent=opts.label;
  _attEl('att-stage-sub').textContent=opts.sub;
  _attEl('att-stage-time').textContent=_attFmtTime(opts.at);
  _attSetHands(opts.from,opts.at,opts.out?-1:2);

  // Force a reflow so a second punch restarts the keyframes instead of
  // inheriting the finished state of the first.
  void card.offsetWidth;
  card.classList.add('is-busy');
  setTimeout(function(){_attRollTime(opts.at);}, fast?0:ATT_T.dial-140);

  var release=function(){
    card.classList.remove('is-busy');
    card.classList.add('is-settling');
    setTimeout(function(){
      card.classList.remove('is-settling','is-sealed','is-out','is-waiting','is-denied','is-resolving');
      var c=_attEl('att-stage-copy');if(c)c.classList.remove('is-recopy');
      _attBusy=false;
      var b=_attEl('att-clock-btn');if(b)b.disabled=false;
    }, fast?0:ATT_T.settle);
  };
  /* Granted. COMING OUT OF THE WAIT NEEDS ITS OWN BEAT — the ring is a short
     arc spinning at some arbitrary angle, and cutting straight to the seal
     snapped from "searching" to "done" with nothing in between. So the arc
     CLOSES first: it keeps spinning while its dash grows out to the full
     circumference, and once it is a complete ring the rotation is invisible,
     which is what lets the spin stop without a jump. Only then does the seal
     draw. Arriving from a punch that never waited, there is no arc to close
     and it seals directly. */
  var pass=function(){
    var wasWaiting=card.classList.contains('is-waiting');
    card.classList.remove('is-waiting');
    _attHideRecovery();
    _attEl('att-stage-label').textContent=opts.label;
    _attEl('att-stage-time').textContent=_attFmtTime(opts.at);
    _attEl('att-stage-sub').textContent=_attEl('att-location').textContent;
    if(wasWaiting)_attReplayCopy();   // the copy changed; let it arrive, not swap
    var seal=function(){
      card.classList.remove('is-resolving');
      card.classList.add('is-sealed');
      setTimeout(function(){commit();release();}, fast?300:ATT_T.hold-ATT_T.seal);
    };
    if(wasWaiting&&!fast){
      card.classList.add('is-resolving');
      setTimeout(seal,ATT_T.close);
    }else seal();
  };
  /* Refused: the punch does not happen, and the stage STAYS UP. An error that
     dismisses itself leaves the user looking at an unchanged card with no idea
     why nothing happened — so it holds, says what went wrong, and offers the
     way out of it. Nothing is recorded either way. */
  var fail=function(reason,kind){
    card.classList.remove('is-waiting');
    card.classList.add('is-denied');
    _attEl('att-stage-label').textContent=kind==='fence'?'Outside office geofence':'Location required';
    _attEl('att-stage-time').textContent='Clock-in cancelled';
    _attEl('att-stage-sub').textContent=reason;
    _attSay(reason);
    _attShowRecovery();
  };

  // Kept on the module so the Allow button can re-enter the wait after a retry
  // without re-running the whole animation behind it.
  _attGate={card:card,pass:pass,fail:fail,release:release,at:opts.at};
  setTimeout(function(){
    if(!opts.gated){pass();return;}
    _attAwaitGate();
  }, fast?0:ATT_T.seal);
}

// Hold on the browser's prompt, then act on whatever it answers.
function _attAwaitGate(){
  var g=_attGate;if(!g)return;
  if(_attLoc.state==='pending'){
    g.card.classList.remove('is-denied');
    g.card.classList.add('is-waiting');
    _attEl('att-stage-label').textContent='Waiting for location';
    _attEl('att-stage-time').textContent=_attFmtTime(new Date());
    _attEl('att-stage-sub').textContent='Allow location access in your browser to finish clocking in';
    // Cancel only — the prompt is already open, so an Allow button here would
    // just be a second thing claiming to do what the dialog is doing. This is
    // also what makes the unlimited wait safe: there is always a way out of it
    // that does not depend on a timer running out.
    _attShowRecovery(true);
  }
  _attLocAwait(function(ok,reason,kind){ ok?g.pass():g.fail(reason,kind); });
}

/* THE RECOVERY BUTTON HAS TO TELL THE TRUTH ABOUT WHAT IT CAN DO. Once a site
   is hard-blocked in Chrome, calling getCurrentPosition again does NOT re-open
   the prompt — it fails instantly with the same error, and a button that
   silently does nothing is worse than no button. So permissions.query decides
   which of two things this is:
     'prompt'  the user dismissed the dialog; asking again really does ask.
     'denied'  only the padlock menu can undo it, so say that instead. */
function _attShowRecovery(cancelOnly){
  var box=_attEl('att-stage-actions'),btn=_attEl('att-retry-btn');
  if(!box)return;
  box.hidden=false;
  if(btn){btn.hidden=!!cancelOnly;btn.textContent='Allow Location Access';}
  var man=_attEl('att-manual-btn');
  if(man)man.hidden=cancelOnly||_attLoc.kind!=='fence';
  if(cancelOnly)return;                       // still waiting: nothing to retry yet
  /* Permission is fine — the user is simply somewhere else. Two ways on: walk
     in and retry, or put the punch in as a manual entry, which goes to the
     approver rather than onto the sheet. */
  if(btn)btn.classList.toggle('is-primary',_attLoc.kind!=='fence');
  if(_attLoc.kind==='fence'){if(btn)btn.textContent='Retry';return;}
  if(!navigator.permissions||!navigator.permissions.query)return;
  navigator.permissions.query({name:'geolocation'}).then(function(st){
    if(st.state!=='denied')return;
    _attEl('att-stage-sub').textContent=
      'Location is blocked for this site. Open the padlock in the address bar, set Location to Allow, then retry.';
    if(btn)btn.textContent='I have allowed it — Retry';
  }).catch(function(){});
}
// Replays the stage copy's entrance so a change of message ARRIVES rather than
// swapping under the reader mid-sentence.
function _attReplayCopy(){
  var box=_attEl('att-stage-copy');if(!box)return;
  box.classList.remove('is-recopy');
  void box.offsetWidth;                       // restart the keyframes
  box.classList.add('is-recopy');
}
function _attHideRecovery(){
  var box=_attEl('att-stage-actions');if(box)box.hidden=true;
}
// Ask again from a fresh user gesture, which is the only kind the browser will
// open a prompt for.
function attRetryLocation(){
  _attHideRecovery();
  _attRequestLocation();
  _attAwaitGate();
}
/* Outside the fence: hand the punch to the manual entry request, seeded with
   the time of the attempt and where it was made from. Nothing is recorded
   until the approver agrees, so the card goes back to idle. */
function attRequestManual(){
  var where=_attLoc.reason||'';
  var at=_attGate&&_attGate.at?_attGate.at:new Date();
  _attHideRecovery();
  if(_attGate)_attGate.release();
  if(typeof arOpenManual==='function')arOpenManual(at,_attPlace,where);
}
// Give up on this punch. Nothing was recorded, so there is nothing to undo.
function attCancelClockIn(){
  _attHideRecovery();
  _attSay('Clock-in cancelled.');
  if(_attGate)_attGate.release();
}


function toggleClock(){
  if(_attBusy)return;                       // one punch at a time
  if(_attDayKey!==_attToday()){             // the day rolled over under us
    _attDayKey=_attToday();_attDaySecs=0;_attInAt=_attOutAt=null;_attState='idle';
  }
  _attState==='in'?_attClockOut():_attClockIn();
}

function _attClockIn(){
  var now=new Date();
  /* Geolocation switched off for the company: the browser is never asked, and
     the punch is not gated on anything. Not asking is the point — a prompt
     for a location the company said it does not want is the bug. */
  if(!_attGeoOn()){
    _attLoc={state:'ok',reason:'',waiters:[]};
    _attSetLocation('Location not captured');
    _attRunStage({at:now,from:null,out:false,gated:false,
                  label:'Clocked in',sub:'Location not captured'},function(){
      _attInAt=now;_attOutAt=null;_attState='in';
      _attPaint();
      clearInterval(_attTimer);
      _attTimer=setInterval(_attTickLogged,1000);
      _attSay('Clocked in at '+_attFmtTime(now)+'.');
    });
    return;
  }
  // Asked FIRST and synchronously, so the browser attributes the prompt to
  // this click. The stage then waits on the answer — see _attRunStage.
  _attRequestLocation();
  _attRunStage({at:now,from:null,out:false,gated:true,
                label:'Clocked in',sub:'Locating…'},function(){
    _attInAt=now;_attOutAt=null;_attState='in';
    _attPaint();
    clearInterval(_attTimer);
    _attTimer=setInterval(_attTickLogged,1000);
    _attSay('Clocked in at '+_attFmtTime(now)+' from '+_attEl('att-location').textContent+'.');
  });
}

// Clocking out is NOT gated: the location was captured on the way in, and
// holding somebody's shift open because a permission dialog went unanswered
// would be a worse failure than a missing coordinate on the way out.
function _attClockOut(){
  var now=new Date();
  var session=Math.max(0,Math.floor((now.getTime()-_attInAt.getTime())/1000));
  var inAt=_attInAt;
  clearInterval(_attTimer);_attTimer=null;
  _attRunStage({at:now,from:inAt,out:true,gated:false,label:'Clocked out',
                sub:'Session '+_attFmtDur(session,false)},function(){
    _attDaySecs+=session;                   // banked, so a second session adds to it
    _attOutAt=now;_attState='done';
    _attPaint();
    _attSay('Clocked out at '+_attFmtTime(now)+'. Total logged today '
      +_attFmtDur(_attDaySecs,false)+'.');
  });
}
