/* ══ NOVA RETAIL: AN APPROVED CARD LOAD IS IN THE WALLET (product owner, 14 Nov 2026) ═════════════════════════════
   "Add on approval": once a card load - a wallet top-up or a benefit load - has its final approval (Ritu, then Rohan),
   the amount is in that wallet. Its execution is recorded at that moment, the presentation's own way (Illustrative:
   nothing is sent to a provider and no funding is posted), so the balance changes everywhere it is shown: My Cards,
   Card List, Wallet & Benefits, the dashboard's Card Balances, and the phone.
   - Recorded by the final approver when they may record loads (Rohan), otherwise by Karan, the company admin.
   - Loads approved before this rule and still awaiting execution are put on once, the same way, so every approved
     top-up is in its wallet.
   - The engine's own steps are used (js/cards.js ccLoadExecRecord), so the load's Logs, its status and the ledger read
     exactly as for any recorded load. Only in the presentation company; every other company keeps execution as a
     separate step. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const nova=function(){return typeof emsMfEnt==='function'?emsMfEnt():'';};
  const admin=function(){return ((typeof idUserByEmail==='function'&&idUserByEmail('karan.shah@novaretail.in'))||{}).userId||'';};
  /* Not while the presentation prepares its data: it records its own loads step by step. */
  const building=function(){return typeof presBuilding!=='undefined'&&presBuilding;};
  function putOn(l,A){
    if(building())return '';
    if(!l||!nova()||l.entity!==nova()||l.status!=='Approved'||!l.exec||l.exec.status!=='Awaiting Execution')return '';
    if(typeof ccDemoOn==='function'&&!ccDemoOn(l.entity))return '';
    const base=A||ccNow();
    let B=Object.assign({},base);
    if(!(ccPCan(B,'card.demo.simulate')&&ccPCan(B,'card.load.create')))B=Object.assign({},base,{who:admin(),actual:''});
    const res=ccLoadExecRecord(l.id,{result:'Recorded',source:CC_DEMO},B);
    return res&&res.error?res.error:'';
  }
  /* 1 · On the final approval (the card-load kind calls ccLoadOnFinal by name). */
  if(typeof ccLoadOnFinal==='function'){
    const f0=ccLoadOnFinal;
    ccLoadOnFinal=function(r,A){
      const out=f0.apply(this,arguments);
      try{const e=putOn(r,A);if(e&&window.console)console.warn('[load on approval]',e);}catch(err){}
      return out;
    };
  }
  /* 2 · Once, for loads approved before (in Nova Retail, as its company admin). */
  function backfill(){
    const ent=nova();if(!ent||typeof ccLoads==='undefined'||typeof entitiesData==='undefined')return 0;
    const n=entitiesData.find(function(e){return e.entityId===ent;});if(!n)return 0;
    const was=seSelectedEntity;seSelectedEntity=n.id;if(typeof emsClearCache==='function')emsClearCache();
    let done=0;
    try{
      const A=Object.assign({},ccNow(),{who:admin(),actual:''});
      ccLoads.filter(function(l){return l.entity===ent&&l.status==='Approved'&&l.exec&&l.exec.status==='Awaiting Execution';})
        .forEach(function(l){if(!putOn(l,A))done++;});
    }finally{seSelectedEntity=was;if(typeof emsClearCache==='function')emsClearCache();}
    if(done&&typeof presSaveSoon==='function')presSaveSoon();
    return done;
  }
  Promise.resolve(window.PRES_READY).then(function(){try{backfill();}catch(e){if(window.console)console.warn('[load on approval]',e);}});
})();
