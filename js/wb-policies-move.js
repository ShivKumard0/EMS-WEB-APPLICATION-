/* ══ BENEFIT POLICIES ARE PART OF POLICIES (product owner, 13-14 Nov 2026) ══════════════════════════════════════════
   13 Nov: "In company admin, from Wallet & Benefits remove the Wallets and Benefit Policies toggle at the top, and list
   all the benefit policies - make it inside Policies."
   14 Nov: "these benefit policies remove the toggle from the top policies and add those benefit policies into the
   policies as well. Remove that toggle" - one card list (product owner's pick).
   - Expense Management → Policies has no Policies | Benefit Policies switch. Its one card list holds the policy
     documents and, after them, the benefit policies: one search, one category filter (policy and benefit categories),
     one set of tiles (Active, Scheduled, Draft, Inactive, Expired) counting both.
   - A benefit policy card shows its status, name, category and entitlement (amount · frequency · wallet · who), and the
     same Action menu as its row had (the status moves, ☰). Learn More opens the same benefit policy panel - Basic
     Details, Edit, New Version, Logs, History - on this page. + asks: Policy or Benefit Policy (the same Add form).
   - Wallet & Benefits keeps no toggle and opens on Wallets.
   For whoever sees benefit policies (Company Admin, Super Admin, Finance). Employees - who read Policies only - are
   unchanged. Benefit policies themselves, their rules, entitlements and wallet funding work as before. In the
   presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof buildWalletBenefitsHTML!=='function'||typeof EPOL_PAGE==='undefined'||typeof epolPageHTML!=='function')return;
  const on=function(){return typeof wbCanView==='function'&&wbCanView('policies');};
  const benefitView=function(){return typeof wbPrimaryOf==='function'&&wbPrimaryOf(wbTab)==='policies';};
  const inBenefit=function(){return on()&&typeof page!=='undefined'&&page==='wallet-benefits'&&benefitView();};
  const onPolicies=function(){return typeof page!=='undefined'&&page===EPOL_PAGE;};
  const STATS=['Active','Scheduled','Draft','Inactive','Expired'];

  /* ── The benefit policies, as the Policies list reads them ── */
  const bpAll=function(){return typeof wbMine==='function'&&typeof wbPolicies!=='undefined'?wbMine(wbPolicies):[];};
  const bpCat=function(r){const c=wbRec('c',r.categoryId);return c?c.name:'';};
  const bpSnip=function(r){
    const v=wbCurV(r),c=wbRec('c',r.categoryId),w=c?wbWalletOf(c):null;
    return [wbMoney(v.amount),wbFreqText(v),w?wbTypeName(w.type)+' wallet':'Claim-based',wbScopeText(v)].filter(Boolean).join(' · ');
  };
  const bpRows=function(){
    const q=String(epolQ||'').toLowerCase().trim();
    return bpAll().filter(function(r){
      if(epolCatF&&bpCat(r)!==epolCatF)return false;
      if(epolStatF&&wbShown('p',r)!==epolStatF)return false;
      if(q&&(r.name+' '+bpCat(r)+' '+r.key+' '+bpSnip(r)+' '+(r.desc||'')).toLowerCase().indexOf(q)<0)return false;
      return true;
    });
  };
  /* While the Policies page is drawn for them, its rows and categories include the benefit policies. */
  let merging=false;
  if(typeof epolRows==='function'){
    const r0=epolRows;
    epolRows=function(){
      const out=r0.apply(this,arguments);
      return merging?out.concat(bpRows().map(function(r){return {__bp:r,id:'bp-'+r.id};})):out;
    };
  }
  if(typeof epolCategories==='function'){
    const c0=epolCategories;
    epolCategories=function(){
      const out=c0.apply(this,arguments);
      if(merging)bpAll().forEach(function(r){const n=bpCat(r);if(n&&out.indexOf(n)<0)out.push(n);});
      return out;
    };
  }
  /* The benefit policy card: the policy card's look, with the row's Action menu (status moves, ☰). */
  if(typeof epolCardHTML==='function'){
    const k0=epolCardHTML;
    epolCardHTML=function(x){
      if(!x||!x.__bp)return k0.apply(this,arguments);
      const r=x.__bp,snip=bpSnip(r);
      return '<div class="epol-card wbp-row'+(wbSel.p===r.id?' lp-row-selected':'')+'" id="wbp-row-'+r.id+'" onclick="wbOpen(\'p\','+r.id+')">'
        +wbBadge(wbShown('p',r))
        +'<div class="epol-ico">'+EPOL_ICO.doc+'</div>'
        +'<div class="epol-name">'+sbEsc(r.name)+'</div>'
        +'<div class="epol-cat">'+sbEsc(bpCat(r)||'Benefit Policy')+'</div>'
        +'<div class="epol-snip" title="'+attrSafe(snip)+'">'+sbEsc(snip)+'</div>'
        +'<div class="epol-bp-act" onclick="event.stopPropagation()">'+(typeof rowLogCell==='function'?rowLogCell('wb-p',r.id):'')+'</div>'
        +'<button type="button" class="epol-more" onclick="event.stopPropagation();wbOpen(\'p\','+r.id+')">Learn More '+EPOL_ICO.arrow+'</button>'
        +'</div>';
    };
  }
  /* One side panel at a time: a policy's or a benefit policy's. */
  if(typeof wbOpen==='function'){
    const o0=wbOpen;
    wbOpen=function(kind){
      if(kind==='p'&&onPolicies()&&typeof epolSel!=='undefined'&&epolSel!=null&&typeof epolClose==='function')epolClose();
      return o0.apply(this,arguments);
    };
  }
  if(typeof epolOpen==='function'){
    const e0=epolOpen;
    epolOpen=function(){
      if(on()&&wbSel.p!=null){wbClose('p');if(wbSel.p!=null)return;}   // an unsaved edit asked to stay
      return e0.apply(this,arguments);
    };
  }

  /* ── The Policies page: one list, no switch ── */
  const p0=epolPageHTML;
  epolPageHTML=function(){
    if(!on()||!epolCanView())return p0.apply(this,arguments);
    if(wbSel.p!=null&&!bpRows().some(function(r){return r.id===wbSel.p;})){if(typeof wbDropEdit==='function')wbDropEdit();wbSel.p=null;}
    merging=true;let out;
    try{out=p0.apply(this,arguments);}finally{merging=false;}
    /* The tiles count both. */
    const docs=epolHere(),bps=bpAll();
    const count=function(s){return docs.filter(function(r){return r.status===s;}).length+bps.filter(function(r){return wbShown('p',r)===s;}).length;};
    const tiles='<div class="listing-stats">'+STATS.map(function(s){
      return '<div class="listing-stat'+(epolStatF===s?' stat-selected':'')+'" onclick="epolToggleStat(\''+s+'\')">'
        +'<div class="listing-stat-count" style="color:var(--st-'+statusTone(s)+'-fg)">'+count(s)+'</div><div class="listing-stat-label">'+s+'</div></div>';
    }).join('')+'</div>';
    out=out.replace(/<div class="listing-stats">[\s\S]*?<\/div><\/div>(?=<div class="lp-split-wrap)/,tiles+'</div>');
    /* The benefit policy panel beside the policy panel. */
    const tmp=document.createElement('div');tmp.innerHTML=out;
    const eb=tmp.querySelector('#epol-split-sb');
    if(eb)eb.insertAdjacentHTML('afterend','<div class="lp-split-sb'+(wbSel.p!=null?' open':'')+'" id="wbp-split-sb"><div class="lp-isb" id="wbp-isb-inner">'
      +(wbSel.p!=null?sbRender(function(){return wbRenderPanel('p');},'wbp'):'')+'</div></div>');
    out=tmp.innerHTML;
    /* Add Benefit Policy and New Version open over this page. */
    if(typeof wbModal!=='undefined'&&wbModal&&(wbModal.kind==='p'||wbModal.kind==='pv')&&typeof wbModalHTML==='function')out+=wbModalHTML();
    return out;
  };

  /* ── + : Policy or Benefit Policy ── */
  let adding=false;
  const addBenefit=function(){
    if(typeof wbStartAdd!=='function')return;
    adding=true;wbTab='policies';
    try{wbStartAdd();}finally{adding=false;}
  };
  const menuItem=function(label,v){return '<div class="ct-act-item emp-act-item" onclick="epolAddPick(\''+v+'\')"><span class="emp-act-label">'+label+'</span></div>';};
  const closeMenu=function(){const m=document.getElementById('epol-add-menu');if(m)m.classList.remove('open');};
  window.epolAddPick=function(v){closeMenu();if(v==='benefit')addBenefit();else epolStart();};
  const chooser=function(){
    let m=document.getElementById('epol-add-menu');
    if(!m){
      m=document.createElement('div');m.id='epol-add-menu';m.className='ct-action-menu emp-act-menu';document.body.appendChild(m);
      document.addEventListener('click',function(e){
        const mm=document.getElementById('epol-add-menu');if(!mm||!mm.classList.contains('open'))return;
        if(mm.contains(e.target)||(e.target.closest&&e.target.closest('#tb-page-add-btn')))return;
        mm.classList.remove('open');
      });
    }
    m.innerHTML=menuItem('Policy','doc')+menuItem('Benefit Policy','benefit');
    const b=document.getElementById('tb-page-add-btn'),r=b?b.getBoundingClientRect():{left:240,bottom:56};
    m.style.left=Math.round(r.left)+'px';m.style.top=Math.round(r.bottom+6)+'px';
    m.classList.toggle('open');
  };
  if(typeof addListingItem==='function'){
    const a0=addListingItem;
    addListingItem=function(pg){
      if(pg===EPOL_PAGE&&on()&&typeof wbCan==='function'&&typeof WB_ADD_PERM!=='undefined'&&wbCan(WB_ADD_PERM.p)){
        if(epolCanManage())chooser();else addBenefit();
        return;
      }
      return a0.apply(this,arguments);
    };
  }
  /* Older links to the switch land on Policies. */
  window.epolGo=function(){if(!onPolicies())navigatePage(EPOL_PAGE);};

  /* ── Wallet & Benefits: no toggle; its menu item opens Wallets. A benefit policy list reached there is shown on
     Policies instead. Manage views keep their Back bar. ── */
  const b0=buildWalletBenefitsHTML;
  buildWalletBenefitsHTML=function(){
    const out=b0.apply(this,arguments);
    if(!on()||(typeof wbIsManageView==='function'&&wbIsManageView(wbTab)))return out;
    if(benefitView())setTimeout(function(){if(inBenefit())navigatePage(EPOL_PAGE);},0);
    const tmp=document.createElement('div');tmp.innerHTML=out;
    const mp=tmp.querySelector('.mod-page'),h=mp&&mp.firstElementChild;
    if(!h||!h.querySelector('.mod-tabs-row'))return out;
    h.remove();
    return tmp.innerHTML;
  };
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){
      if(pg==='wallet-benefits'&&on()){
        if(adding)return;                      // + Benefit Policy on Policies: the form opens here
        if(benefitView())wbTab='wallets';
      }
      return n0.apply(this,arguments);
    };
  }
  /* While a benefit policy list is on Wallet & Benefits for a moment: the menu shows Policies, titled Policies. */
  if(typeof getSidebarActivePage==='function'){
    const a0=getSidebarActivePage;
    getSidebarActivePage=function(pg){return pg==='wallet-benefits'&&inBenefit()?EPOL_PAGE:a0.apply(this,arguments);};
  }
  if(typeof getPageTitle==='function'){
    const t0=getPageTitle;
    getPageTitle=function(pg){return pg==='wallet-benefits'&&inBenefit()?'Policies':t0.apply(this,arguments);};
  }
})();
