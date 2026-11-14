/* ══ EXPENSE ITEM: GST AMOUNT (product owner, 14 Nov 2026) ════════════════════════════════════════════════════════
   Each expense item has an optional GST Amount box next to Vendor GSTIN. It is kept with the item's other columns
   (l.cols['GST Amount']) and shown wherever Vendor GSTIN is. Optional: a claim without it is saved exactly as
   before. A value must be a number of 0 or more and not more than the item's Amount Spent.
   Claims sent from the mobile app fill Vendor GSTIN and GST Amount from the scanned receipt. */
(function(){
  if(typeof EXP_CUSTOM_COLS==='undefined')return;
  const GST='GST Amount';
  if(EXP_CUSTOM_COLS.indexOf(GST)<0){
    const at=EXP_CUSTOM_COLS.indexOf('Vendor GSTIN');
    EXP_CUSTOM_COLS.splice(at>=0?at+1:EXP_CUSTOM_COLS.length,0,GST);
  }
  /* The box takes a number. */
  if(typeof expLineFieldsHTML==='function'){
    const f0=expLineFieldsHTML;
    expLineFieldsHTML=function(){
      const out=f0.apply(this,arguments),i=EXP_CUSTOM_COLS.indexOf(GST);
      if(i<0)return out;
      return out.replace('id="exp-l-col-'+i+'" ','id="exp-l-col-'+i+'" type="number" min="0" step="0.01" inputmode="decimal" ');
    };
  }
  /* Not more than the item itself, never below 0. Empty is fine. */
  if(typeof expCheckLine==='function'){
    const c0=expCheckLine;
    expCheckLine=function(d){
      const ok=c0.apply(this,arguments);
      if(!ok||!d)return ok;
      const raw=String(((d.cols||{})[GST])||'').trim();
      if(!raw)return ok;
      const g=parseFloat(raw),amt=parseFloat(d.amount);
      if(isNaN(g)||g<0){showToast('GST Amount is not valid','error','Enter the GST shown on the receipt, or leave it empty.');return false;}
      if(!isNaN(amt)&&g>amt){showToast('GST Amount is more than the Amount Spent','error','The GST on an item cannot be more than the item itself.');return false;}
      return ok;
    };
  }
})();
