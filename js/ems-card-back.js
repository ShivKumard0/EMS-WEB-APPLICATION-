/* The back of the card, beside the front (product owner, 16 Nov 2026).
   "Along with the front, on the side of it add the back as well, and a blur effect on the CVV 3 digit number."
   Wherever the card is drawn (emsCardVisual, js/ems-mycards.js) the back is drawn next to it: assets/card-back.svg, a
   vector of the supplied design. The CVV is written over it and blurred like the card number; it shows while the back
   (or the front) is hovered, focused or tapped. Like the number, the CVV is worked out from the card's own reference,
   never saved, and only the cardholder gets it - everyone else sees three dots (js/ems-card-mask.js decides who).
   Display only: nothing about the card, its requests or its approvals changes. */
(function(){
  if(typeof emsCardVisual!=='function'||typeof emsCardSecret!=='function')return;
  function cvvOf(c){
    let h=2166136261;
    (String(c.key)+'|'+c.id+'|'+c.employeeEid+'|cvv').split('').forEach(function(ch){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;});
    return ('000'+(h%1000)).slice(-3);
  }
  window.emsCardBackHTML=function(cvv,cls){
    return '<div class="emsvb'+(cls||'')+'" tabindex="0" role="img" aria-label="Back of the card" onclick="this.classList.toggle(\'is-shown\')" title="'
      +(cvv==='•••'?'Only the cardholder sees the CVV':'Hover to see the CVV')+'"><span class="emsvb-cvv emsvc-secret">'+cvv+'</span></div>';
  };
  const v0=emsCardVisual;
  emsCardVisual=function(c){
    const out=v0.apply(this,arguments);
    let own=false;try{own=!/^•/.test(String(emsCardSecret(c).num||'•'));}catch(e){}
    const m=/class="emsvc-card( is-ended| is-dim)?/.exec(out);
    return '<div class="emsvc-pair">'+out+emsCardBackHTML(own?cvvOf(c):'•••',(m&&m[1])||'')+'</div>';
  };
})();
