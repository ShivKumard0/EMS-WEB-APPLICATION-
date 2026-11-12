/* ══ EXPENSE CLAIM: ATTACHMENTS (product owner, 12 Nov 2026) ═══════════════════════════════════════════════════════
   1. Review Line Items (Approve from the list's Action menu) shows each line item's attachment - its expense proof -
      and opens it.
   2. The claim's panel has an Attachments tab after Basic Details: every line item's expense proof, and the claim's own
      attachments - added with the same drop zone as everywhere else in the application (drop or click to browse,
      up to 10 MB each; opened, downloaded or removed from the list). In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  /* The claim's own files hang off the claim (r.attachments), like every other record's. */
  if(typeof ATTACH_SCOPES!=='undefined'&&!ATTACH_SCOPES.exp)ATTACH_SCOPES.exp={find:function(id){return typeof expRec==='function'?expRec(Number(id)):null;}};
  const esc=function(s){return typeof sbEsc==='function'?sbEsc(s):String(s);};
  const chip=function(r,l){
    if(!l.proof)return '<span class="wb-muted">No file</span>';
    return '<button type="button" class="exp-proof" onclick="event.stopPropagation();expOpenProof('+r.id+','+l.id+')" title="'+attrSafe(l.proof)+'">'
      +(typeof EXP_ICO!=='undefined'?EXP_ICO.clip:'')+'<span>'+esc(l.proof)+'</span></button>';
  };
  window.expAttChip=chip;
  /* 2 · The panel tab. */
  if(typeof axTabBar==='function'){
    const t0=axTabBar;
    axTabBar=function(prefix,tabs){
      if(prefix==='exp'&&Array.isArray(tabs)&&tabs.some(function(t){return t.id==='bank';})&&!tabs.some(function(t){return t.id==='attachments';})){
        const at=tabs.findIndex(function(t){return t.id==='basic-details';});
        const list=tabs.slice();list.splice(at+1,0,{id:'attachments',label:'Attachments'});
        const args=Array.prototype.slice.call(arguments);args[1]=list;return t0.apply(this,args);
      }
      return t0.apply(this,arguments);
    };
  }
  function tabHTML(r){
    const ls=r.lines||[];
    const proofs='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Expense Proofs</span><span class="wb-muted">'+ls.filter(function(l){return l.proof;}).length+' of '+ls.length+' line items</span></div>'
      +(ls.length?'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Sr. No</th><th>Line Item</th><th>Category / Sub Category</th><th style="text-align:right">Amount</th><th>Attachment</th></tr></thead><tbody>'
        +ls.map(function(l,i){
          return '<tr><td class="csag-td csag-num">'+(i+1)+'</td><td class="csag-td"><div class="lp-c-main">'+esc(l.title||'Item')+'</div></td>'
            +'<td class="csag-td">'+esc((l.category||r.category||'')+(l.subCat?' / '+l.subCat:''))+'</td>'
            +'<td class="csag-td" style="text-align:right;white-space:nowrap">'+(typeof expMoney==='function'?expMoney(l.amount,r.currency):esc(l.amount))+'</td>'
            +'<td class="csag-td">'+chip(r,l)+'</td></tr>';
        }).join('')+'</tbody></table></div>':'<div class="wb-empty-sm">No line items yet.</div>');
    const more='<div class="lp-sb-view-header" style="margin-top:18px"><span class="lp-sb-section-title">Claim Attachments</span></div>'
      +(typeof attachTabHTML==='function'?attachTabHTML('exp',r.id):'');
    return proofs+more;
  }
  if(typeof renderExpSidebar==='function'){
    const s0=renderExpSidebar;
    renderExpSidebar=function(){
      const out=s0.apply(this,arguments);
      if(typeof expTab==='undefined'||expTab!=='attachments')return out;
      const r=typeof expRec==='function'?expRec(expSelectedId):null;if(!r)return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      const body=tmp.querySelector('.lp-isb-body');if(!body)return out;
      body.innerHTML=tabHTML(r);
      return tmp.innerHTML;
    };
  }
})();
