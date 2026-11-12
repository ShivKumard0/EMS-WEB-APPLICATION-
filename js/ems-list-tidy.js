/* ══ EXPENSES & ADVANCES LIST: ONE LINE PER CELL (product owner, 12 Nov 2026) ═════════════════════════════════════
   "remove the subtext: settlement not available, partially … remove all the subtext". The list's rows show only each
   column's main value: the grey second lines (type and date, department, purpose, approved amount, approval step and
   Overdue, Limit exceeded, Settlement) are left out. Everything is still in the record's panel; filters and the
   status tiles are unchanged. */
(function(){
  if(typeof eaRowHTML!=='function')return;
  const r0=eaRowHTML;
  eaRowHTML=function(){
    return r0.apply(this,arguments).replace(/<div class="lp-c-sub[^"]*"[^>]*>[\s\S]*?<\/div>/g,'');
  };
})();
