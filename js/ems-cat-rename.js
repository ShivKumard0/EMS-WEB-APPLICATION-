/* One name per expense category (product owner, 16 Nov 2026).
   Five of the older categories had a newer twin: Travel Reimbursement / Travel & Transport, Meal Allowance / Meals &
   Refreshments, Fuel Reimbursement / Fuel & Vehicle Expenses, Office Stationery / Office Supplies & Services, Books &
   Learning / Learning & Development. The newer name stays (EXP_CAT_RENAMED, js/expenses.js) and carries the expense
   types of both. This file moves what is already recorded - claims and their items, limits, budgets, approval routes,
   advance types, card controls, claim-based benefits, policies - to the newer name, then takes the five older names
   out of the lists. Only the category name changes: no amount, status, approver or step is touched.
   The older names stay valid while the company's data is being set up; they go once that is done. */
(function(){
  if(typeof EXP_CAT_RENAMED==='undefined'||typeof EXP_CATEGORIES==='undefined')return;
  const MAP=EXP_CAT_RENAMED,ONE={category:1,plannedCategory:1,expCat:1},MANY={cats:1,allowedCats:1,blockedCats:1};
  function walk(o,seen,d){
    if(!o||typeof o!=='object'||d>14||o.nodeType||seen.has(o))return 0;
    seen.add(o);let n=0;
    (Array.isArray(o)?o.map(function(_,i){return i;}):Object.keys(o)).forEach(function(k){
      const v=o[k];
      if(typeof v==='string'){if(ONE[k]&&MAP[v]){o[k]=MAP[v];n++;}}
      else if(Array.isArray(v)&&MANY[k]){
        if(v.some(function(x){return typeof x==='string'&&MAP[x];})){
          const out=[];v.forEach(function(x){const y=typeof x==='string'&&MAP[x]?MAP[x]:x;if(out.indexOf(y)<0)out.push(y);});
          v.length=0;out.forEach(function(x){v.push(x);});n++;
        }
      }else if(v&&typeof v==='object')n+=walk(v,seen,d+1);
    });
    return n;
  }
  function finish(){
    try{
      if(typeof presBuilding!=='undefined'&&presBuilding)return;
      const names=(typeof presCandidates==='function'?presCandidates():[]).concat(['expensesData','cappingData','wbCategories','epolRecords']);
      const seen=new WeakSet();let n=0;
      names.forEach(function(nm){
        let v;try{v=typeof presGet==='function'?presGet(nm):window[nm];}catch(e){v=undefined;}
        if(v&&typeof v==='object')n+=walk(v,seen,0);
      });
      /* the lists: the newer name takes the older one's place */
      const out=[];EXP_CATEGORIES.forEach(function(c){const y=MAP[c]||c;if(out.indexOf(y)<0)out.push(y);});
      const was=EXP_CATEGORIES.length;
      EXP_CATEGORIES.length=0;out.forEach(function(c){EXP_CATEGORIES.push(c);});
      Object.keys(MAP).forEach(function(c){delete EXP_SUBCATS[c];});
      if(n&&typeof presSaveSoon==='function')presSaveSoon();
      if((n||was!==out.length)&&typeof renderADTPage==='function'&&document.getElementById('tb-page-title'))try{renderADTPage();}catch(e){}
    }catch(e){}
  }
  window.emsCatRenameRun=finish;
  Promise.resolve(window.PRES_READY).then(finish);
})();
