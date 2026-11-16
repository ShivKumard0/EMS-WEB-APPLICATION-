/* New Request: a limit already justified steps aside when the next item is added (product owner, 16 Nov 2026).
   "Once I fill the expense item and the limit is exceeded, I fill my comments in Policy justification and add
   another item - the policy justification should vanish as soon as I open Add Expense Item and fill the other item."
   When Add Expense Item is pressed, every over-limit box whose justification has been written is put away: it is not
   drawn again while its figures (limit, this claim, over by) stay the same. What was written is kept with the request
   and is sent as before; the confirmation on Submit still shows the limit and the justification. A box comes back if
   its figures change (the new item pushes the same limit further), and a limit not yet justified is always shown.
   Display only: the limit check, the need for a justification, submission and approval are unchanged. */
(function(){
  if(typeof expPolicyBlockHTML!=='function'||typeof expAddModalLine!=='function')return;
  const p0=expPolicyBlockHTML;
  /* the over-limit boxes of a block: {key: its figures} */
  function rows(html){
    const tmp=document.createElement('div');tmp.innerHTML=html;const out=[];
    tmp.querySelectorAll('.ep-eval-row').forEach(function(row){
      const t=row.querySelector('textarea[data-epjust]');if(!t)return;
      const n=row.querySelector('.ep-eval-nums');
      out.push({key:t.getAttribute('data-epjust'),sig:(n?n.textContent:'').replace(/\s+/g,' ').trim(),row:row});
    });
    return {tmp:tmp,list:out};
  }
  expPolicyBlockHTML=function(d){
    const html=p0.apply(this,arguments);
    try{
      const q=d&&d.polQuiet;
      if(!q||!html||typeof expModalOpen==='undefined'||!expModalOpen)return html;
      const r=rows(html);let cut=0;
      r.list.forEach(function(x){if(q[x.key]===x.sig&&d.just&&String(d.just[x.key]||'').trim()){x.row.remove();cut++;}});
      if(!cut)return html;
      const ev=r.tmp.querySelector('.ep-eval');
      if(ev&&!ev.children.length)ev.remove();
      return r.tmp.innerHTML;
    }catch(e){return html;}
  };
  const a0=expAddModalLine;
  expAddModalLine=function(){
    const d0=typeof expDraft!=='undefined'?expDraft:null,n=d0&&d0.lines?d0.lines.length:0;
    const res=a0.apply(this,arguments);
    try{
      const d=expDraft;
      if(d&&d.lines&&d.lines.length>n){                    // the item was accepted and a new one opened
        const q=d.polQuiet||{};
        rows(p0.call(this,d)).list.forEach(function(x){if(d.just&&String(d.just[x.key]||'').trim())q[x.key]=x.sig;});
        d.polQuiet=q;
        if(typeof expPolicyRefresh==='function')expPolicyRefresh();else if(typeof expRepaintForm==='function')expRepaintForm();
      }
    }catch(e){}
    return res;
  };
})();
