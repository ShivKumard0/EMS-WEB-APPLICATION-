/* ══ ONE CARD PROGRAMME IN EVERY PROGRAMME DROP-DOWN (product owner, 16 Nov 2026) ═══════════════════════════════════
   "Everywhere in that drop-down just keep only one - OpenDhi Multi+ Corporate Card - rest remove everything."
   In the presentation, in every company:
   - The company's card programme (its first active one) is named OpenDhi Multi+ Corporate Card, and is offered under
     that name alone, without its code.
   - Every Card Programme drop-down - New Card Request, and the programme filter on Cards, Requests, Loads and
     Statements - offers that one programme only.
   Only the name and what the drop-downs offer change. Any other programme of a company stays as it is, with its
   cards, requests, loads and statements; codes, routes, approvals and every record are untouched. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof ccProgs!=='function'||typeof ccProgLabel!=='function'||typeof apCS!=='function')return;
  const NAME=typeof PRES_CARD!=='undefined'?PRES_CARD:'OpenDhi Multi+ Corporate Card';
  const IDS=['ccrf-prog','cra-f-prog','ccr-f-prog','cc-f-prog','ccl-f-prog','cst-f-prog','cstf-prog'];
  const building=function(){return typeof presBuilding!=='undefined'&&presBuilding;};
  /* the company's programme: the first active one, else the first */
  const main=function(ent){
    let list=[];try{list=ccProgs(ent)||[];}catch(e){return null;}
    const by=list.slice().sort(function(a,b){return a.id-b.id;});
    return by.find(function(p){return p.name===NAME;})||by.find(function(p){return p.status==='Active';})||by[0]||null;
  };
  const isMain=function(p){if(!p||building())return false;const m=main(p.entity);return !!m&&m.id===p.id;};
  function rename(){
    if(building())return false;let ch=false;
    (typeof entitiesData!=='undefined'?entitiesData:[]).forEach(function(e){
      try{const m=main(e.entityId);if(m&&m.name!==NAME){m.name=NAME;ch=true;}}catch(x){}
    });
    if(ch){if(typeof emsClearCache==='function')emsClearCache();if(typeof presSaveSoon==='function')presSaveSoon();}
    return ch;
  }
  const l0=ccProgLabel;
  ccProgLabel=function(p){return isMain(p)?p.name:l0.apply(this,arguments);};
  const a0=apCS;
  apCS=function(id,opts){
    if(IDS.indexOf(id)<0||building()||!Array.isArray(opts))return a0.apply(this,arguments);
    const m=main(),lab=m?ccProgLabel(m):'';
    if(!lab)return a0.apply(this,arguments);
    const args=Array.prototype.slice.call(arguments);
    const keep=opts.filter(function(o){return o===lab;});
    args[1]=keep.length||id==='ccrf-prog'||id==='cstf-prog'?keep:[lab];   // a form offers it only where it may be picked
    return a0.apply(this,args);
  };
  Promise.resolve(window.PRES_READY).then(function(){try{if(rename()&&typeof renderADTPage==='function'&&typeof page!=='undefined')renderADTPage();}catch(e){}});
})();
