/* ══ NOVA RETAIL: WALLET REQUEST - TELECOM AND GIFT FOR ARJUN (product owner, 14 Nov 2026) ══════════════════════════
   "for the wallet request for arjun rao currently health is just available, now make telecom and gift also available".
   A Wallet Request offers only the wallets the card does not have yet. Once, Telecom and Gift are taken off Arjun Rao's
   card (CRD-1001) and switched off in his Card Benefit, so both records agree; each change is logged. He can then ask
   for Health, Telecom and Gift.
   When a wallet request is approved, the wallet goes back on the card (js/ems-card-types.js emsWrqOnFinal) and - so the
   two records keep agreeing - its Card Benefit is switched on again with the limit it had. Approval loads nothing; a
   wallet that had money left in it shows that balance again. Only in the presentation company. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const OFF=['TEL','GIFT'];
  const nova=function(){return typeof emsMfEnt==='function'?emsMfEnt():'';};
  function arjunCard(){
    const u=typeof idUserByEmail==='function'?idUserByEmail('arjun.rao@opendhi.in'):null;
    if(!u||!u.eid||typeof ccCardsOfEmp!=='function')return null;
    return ccCardsOfEmp(u.eid).find(function(c){return c.entity===nova()&&c.status==='Active';})||null;
  }
  /* 1 · Once: Telecom and Gift off Arjun's card and off his Card Benefit. Card Benefit is filled in after the
     presentation is ready (js/emp-card-benefit.js ecbSeedNova, which leaves a set record alone), so it is filled first
     here; each part has its own flag, so neither repeats. */
  function once(){
    if(typeof presBuilding!=='undefined'&&presBuilding)return;
    const c=arjunCard();if(!c)return;
    const name=function(w){return typeof wbTypeName==='function'?wbTypeName(w):w;};
    let changed=false;
    if(!c.mfWrqOff){
      c.mfWrqOff=true;changed=true;
      const on=typeof ccCardWallets==='function'?ccCardWallets(c):(c.wallets||[]);
      const gone=on.filter(function(w){return OFF.indexOf(w)>=0;});
      if(gone.length){
        c.wallets=on.filter(function(w){return OFF.indexOf(w)<0;});
        const A=typeof ccNow==='function'?ccNow():null;
        if(typeof ccLog==='function')ccLog(c,c.status,gone.map(name).join(' and ')+' switched off on this card, so they can be asked for with a Wallet Request (product owner, 14 Nov 2026).',A);
      }
    }
    if(!c.mfWrqEcbOff&&typeof ecbSetWallet==='function'&&typeof ecbEntry==='function'){
      if(typeof ecbSeedNova==='function')try{ecbSeedNova();}catch(e){}
      if(typeof ecbConfigured!=='function'||ecbConfigured(c.employeeEid)){
        c.mfWrqEcbOff=true;changed=true;
        const has=typeof ccCardWallets==='function'?ccCardWallets(c):(c.wallets||[]);
        OFF.forEach(function(w){
          const x=ecbEntry(c.employeeEid,w);
          if(x&&x.on&&has.indexOf(w)<0)ecbSetWallet(c.employeeEid,w,{on:false},name(w)+' switched off: the wallet is no longer on the card (it can be requested again).','Active');
        });
      }
    }
    if(changed&&typeof presSaveSoon==='function')presSaveSoon();
  }
  /* 2 · An approved wallet request switches the wallet's Card Benefit back on. */
  if(typeof emsWrqOnFinal==='function'){
    const f0=emsWrqOnFinal;
    emsWrqOnFinal=function(r,A){
      const out=f0.apply(this,arguments);
      try{
        if(r&&r.entity===nova()&&['Approved','Partially Approved'].indexOf(r.status)>=0&&typeof ecbSetWallet==='function'&&typeof ecbConfigured==='function'&&ecbConfigured(r.employeeEid))
          (r.wallets||[]).forEach(function(w){
            const b=typeof ecbBook!=='undefined'?ecbBook[r.employeeEid]:null,had=b&&b.wallets&&b.wallets[w];
            if(had&&!(typeof ecbEntry==='function'&&ecbEntry(r.employeeEid,w)||{}).on)
              ecbSetWallet(r.employeeEid,w,{on:true},(typeof wbTypeName==='function'?wbTypeName(w):w)+' switched on: the wallet is on the card again ('+(typeof expKey==='function'?expKey(r):'wallet request')+').','Active');
          });
      }catch(e){}
      return out;
    };
  }
  Promise.resolve(window.PRES_READY).then(function(){try{once();}catch(e){if(window.console)console.warn('[wallet request]',e);}});
})();
