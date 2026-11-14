/* ══ ONLY THE CARDHOLDER SEES THE CARD NUMBER (product owner, 14 Nov 2026) ══════════════════════════════════════════
   "none of the card number other than the employee can see the card number, make the card number masked to company
   admin, manager, finance admin."
   The card number is worked out in one place (js/ems-mycards.js emsCardSecret) and read by every screen that shows it:
   the card drawn in My Cards and in card panels, and Card List (its Card Number column, search and panel). The full
   number now comes back only when the person signed in is the card's own employee; for everyone else - Super Admin,
   Company Admin, Manager, Finance Admin and any other role - it reads •••• •••• •••• and the last four digits.
   Nothing else changes: the card, its expiry, wallets, balances, loads, controls and every action work as before. */
(function(){
  if(typeof emsCardSecret!=='function')return;
  const mine=function(c){return !!c&&typeof emsIsMe==='function'&&emsIsMe({eid:c.employeeEid});};
  const s0=emsCardSecret;
  emsCardSecret=function(c){
    const x=s0.apply(this,arguments);
    return mine(c)?x:{num:'•••• •••• •••• '+String((c&&c.last4)||'----'),exp:x.exp};
  };
  /* The card's hover hint says so. */
  if(typeof emsCardVisual==='function'){
    const v0=emsCardVisual;
    emsCardVisual=function(c){
      const out=v0.apply(this,arguments);
      return mine(c)?out:out.replace('title="Hover to see the card number"','title="Only the cardholder sees the card number"');
    };
  }
})();
