/* ══ SMALL CHANGES OF 12 NOV 2026 (product owner) ═══════════════════════════════════════════════════════════════════
   1. Expenses & Advances lists the newest request first: by the time it was created (its first log), not by its date
      alone - a claim just made sits above an advance made earlier the same day. Everywhere.
   In the presentation (the product):
   2. A wallet's ☰ panel has no Linked Categories tab (Basic Details · Funding · Balances · Employees · Logs · History).
   3. An expense item's "Line Title" reads "Expense Title".
   4. An expense item has no Attendees field (a value recorded before stays on the record). */
function eaTs(x){
  const r=x&&x.r,L=(r&&r.logs)||[];let t=0;
  L.forEach(function(l){const v=Date.parse(String(l.date||'')+' '+String(l.time||''));if(v&&(!t||v<t))t=v;});
  if(!t&&r&&r.createdAt){const p=String(r.createdAt).split(' | ');t=Date.parse(p[0]+' '+(p[1]||''))||0;}
  if(!t&&x&&x.date)t=Date.parse(x.date)||0;
  return t||0;
}
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  /* 2 · no Linked Categories tab on a wallet */
  if(typeof wbTabsFor==='function'){
    const t0=wbTabsFor;
    wbTabsFor=function(kind){const t=t0.apply(this,arguments);return kind==='w'?t.filter(function(x){return x.id!=='linked'&&!/linked categories/i.test(x.label||'');}):t;};
  }
  /* 3 · Expense Title */
  if(typeof expLineFieldsHTML==='function'){
    const f0=expLineFieldsHTML;
    expLineFieldsHTML=function(){return f0.apply(this,arguments).replace('>Line Title <span class="req">','>Expense Title <span class="req">');};
  }
  if(typeof expCheckLine==='function'){
    const c0=expCheckLine;
    expCheckLine=function(){
      const st=window.showToast;window.showToast=function(a,b,c){return st.call(this,String(a||'').replace('Line Title','Expense Title'),b,c==null?c:String(c).replace('Line Title','Expense Title'));};
      try{return c0.apply(this,arguments);}finally{window.showToast=st;}
    };
  }
  /* 4 · no Attendees */
  if(typeof EXP_CUSTOM_COLS!=='undefined'){const i=EXP_CUSTOM_COLS.indexOf('Attendees');if(i>=0)EXP_CUSTOM_COLS.splice(i,1);}
})();
