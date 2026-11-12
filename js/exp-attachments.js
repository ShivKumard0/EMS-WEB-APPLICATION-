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
  /* Adding or removing a claim attachment is written to the claim's Logs, with date and time. */
  const logAtt=function(id,text){const r=typeof expRec==='function'?expRec(Number(id)):null;if(r&&typeof caLog==='function')caLog(r,r.status,text);};
  if(typeof attachCommit==='function'){
    const c0=attachCommit;
    attachCommit=function(scope,id){
      if(scope!=='exp')return c0.apply(this,arguments);
      const rec=attachRec('exp',id),n0=rec?rec.attachments.length:0;
      const out=c0.apply(this,arguments);
      const now=attachRec('exp',id);
      if(now&&now.attachments.length>n0){logAtt(id,'Attachment added: '+now.attachments.slice(0,now.attachments.length-n0).map(function(a){return a.name;}).join(', ')+'.');renderADTPage();}
      return out;
    };
  }
  if(typeof attachRemove==='function'){
    const r0=attachRemove;
    attachRemove=function(scope,id,i){
      if(scope!=='exp')return r0.apply(this,arguments);
      const rec=attachRec('exp',id),gone=rec&&rec.attachments[i]?rec.attachments[i].name:'',n0=rec?rec.attachments.length:0;
      const out=r0.apply(this,arguments);
      const now=attachRec('exp',id);
      if(gone&&now&&now.attachments.length<n0){logAtt(id,'Attachment removed: '+gone+'.');renderADTPage();}
      return out;
    };
  }
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
      if(typeof expTab!=='undefined'&&expTab==='basic-details'){
        /* Each line item's badge: the decision taken on it at the stage it is in (js/ea-approve-lines.js). */
        const rb=typeof expRec==='function'?expRec(expSelectedId):null;if(!rb||typeof expLineShown!=='function')return out;
        const tb=document.createElement('div');tb.innerHTML=out;
        tb.querySelectorAll('.exp-line').forEach(function(card){
          const a=card.querySelector('.exp-line-amt'),m=a&&/-L(\d+)/.exec(a.textContent);if(!m)return;
          const l=rb.lines.find(function(x){return x.id===Number(m[1]);});if(!l)return;
          const b=card.querySelector('.exp-line-hd .lp-status-badge'),v=expLineShown(rb,l);
          if(b&&v&&b.textContent.trim()!==v){const t=document.createElement('span');t.innerHTML=axBadge(typeof statusTone==='function'?statusTone(v):'idle',v);b.replaceWith(t.firstChild);}
        });
        return tb.innerHTML;
      }
      if(typeof expTab==='undefined'||expTab!=='attachments')return out;
      const r=typeof expRec==='function'?expRec(expSelectedId):null;if(!r)return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      const body=tmp.querySelector('.lp-isb-body');if(!body)return out;
      body.innerHTML=tabHTML(r);
      return tmp.innerHTML;
    };
  }
})();
