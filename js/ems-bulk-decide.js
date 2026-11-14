/* ══ APPROVE OR REJECT SEVERAL AT ONCE (product owner, 14 Nov 2026) ════════════════════════════════════════════════
   "in expense and management and in request and loads i want to apply the filter and then … a select checkbox on the
   left side of the line items, and on the top select all, and then i can [decide] multiple, or all at once."
   On Expenses & Advances and on Corporate Cards → Requests & Loads:
   - Once a filter is applied (Search, or a status tile): a checkbox at the left of every row the signed-in person can decide now - Ritu her pending rows, Rohan his, the
     Company Admin and Super Admin every pending row (the same rule as one approval: caCanDecide). The checkbox in the
     heading selects every such row matching the filter, on every page.
   - With rows selected, a bar offers Approve and Reject; a popup takes one comment for all (needed to reject, and when
     deciding in someone else's place). Each request is then decided through the engine's own step (caDecide), exactly
     as from its own panel: same checks, same logs, same next step. What could not be decided is listed.
   - For the Company Admin and Super Admin, one more filter: Pending At (Manager, Finance).
   New only: with nothing selected the lists, their panels, single approvals and every other filter work as before.
   In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof caDecide!=='function'||typeof caCanDecide!=='function')return;
  const esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  const me=function(){return typeof caMe==='function'?caMe():'';};
  const isAdmin=function(){
    const r=(typeof emsRole==='function'?emsRole():'')+'|'+(typeof emsRoleLabel==='function'?emsRoleLabel():'');
    return /(^|\|)(Super Admin|Company Admin)(\||$)/.test(r);
  };
  /* Manager or Finance: the step a pending request is at. */
  const roleOf=function(r){
    if(!r||r.status!=='Awaiting Approval'||typeof caActiveStage!=='function')return '';
    const st=caActiveStage(r);if(!st)return '';
    return st.type==='Reporting Manager'||/manager/i.test(st.name||'')?'Manager':/finance/i.test(st.name||'')?'Finance':'';
  };
  const AT=['Manager','Finance'];
  let atF={ea:'',rl:''};
  const picked={ea:new Set(),rl:new Set()};

  /* ── The two lists ── */
  const onEA=function(){return typeof page!=='undefined'&&page==='expenses'&&!!document.querySelector('table.ea-table');};
  const onRL=function(){return typeof ccRqaHere==='function'&&ccRqaHere()&&!!document.querySelector('table.cc-rqa-table');};
  const which=function(){return onEA()?'ea':onRL()?'rl':'';};
  const L={
    ea:{table:'table.ea-table',
      items:function(){return eaRows().filter(eaRowPass).filter(function(x){return x.kind==='exp'||x.kind==='adv';}).map(function(x){return {k:x.kind+':'+x.id,r:x.r,row:(x.kind==='exp'?'exp-row-':'adv-row-')+x.id,key:x.key};});}},
    rl:{table:'table.cc-rqa-table',
      items:function(){return ccRqaShown(ccRqaItems()).map(function(x){return {k:x.kind+':'+x.id,r:x.rec,row:(x.kind==='req'?'ccr-row-':'ccl-row-')+x.id,key:x.key};});}}
  };
  const can=function(it){try{return caCanDecide(it.r,me());}catch(e){return false;}};
  /* Only once a filter is applied (product owner, 14 Nov 2026: "when i apply filter and click on search then only show
     the selecting option"): with no filter the lists show no checkboxes. */
  const filtered=function(w){
    try{return w==='ea'?[eaQ,eaTypeF,eaApprF,eaPayF,eaSetF,eaWhoF,eaFrom,eaTo,eaCatF,eaDeptF,atF.ea].some(Boolean)
      :[ccRqaQ,ccRqaTypeF,ccRqaProgF,ccRqaStatusF,atF.rl].some(Boolean);}catch(e){return false;}
  };
  const selectable=function(w){try{return filtered(w)?L[w].items().filter(can):[];}catch(e){return [];}};

  /* ── Pending At filter (admins): part of each list's own filter ── */
  if(typeof eaRowPass==='function'){
    const p0=eaRowPass;
    eaRowPass=function(x){return p0.apply(this,arguments)&&(!atF.ea||!isAdmin()||roleOf(x.r)===atF.ea);};
  }
  if(typeof ccRqaShown==='function'){
    const s0=ccRqaShown;
    ccRqaShown=function(){const out=s0.apply(this,arguments);return atF.rl&&isAdmin()?out.filter(function(x){return roleOf(x.rec)===atF.rl;}):out;};
  }
  const dd=function(w){return typeof apCS==='function'?apCS('bulk-f-at-'+w,AT,atF[w],'All Pending At'):'';};
  const withFilter=function(out,w,resetCall,applyCall){
    if(!isAdmin())return out;
    const clear=atF[w]&&out.indexOf('onclick="'+resetCall+'"')<0&&typeof clearFiltersBtn==='function'?clearFiltersBtn([atF[w]],resetCall):'';
    const at=out.indexOf('<button class="lp-pill-clear" onclick="'+resetCall+'"');
    const s='<button class="lp-pill-search" onclick="'+applyCall+'">';
    if(at>=0)return out.slice(0,at)+dd(w)+out.slice(at);
    const i=out.indexOf(s);return i<0?out:out.slice(0,i)+dd(w)+clear+out.slice(i);
  };
  const read=function(w){const el=document.getElementById('csw-bulk-f-at-'+w);if(!el||typeof getCSValue!=='function')return;const v=getCSValue('bulk-f-at-'+w);atF[w]=AT.indexOf(v)>=0?v:'';};
  if(typeof eaListHTML==='function'){const f0=eaListHTML;eaListHTML=function(){return withFilter(f0.apply(this,arguments),'ea','eaReset()','eaApply()');};}
  if(typeof ccRqaListHTML==='function'){const f0=ccRqaListHTML;ccRqaListHTML=function(){return withFilter(f0.apply(this,arguments),'rl','ccRqaReset()','ccRqaApply()');};}
  if(typeof eaApply==='function'){const f0=eaApply;eaApply=function(){read('ea');return f0.apply(this,arguments);};}
  if(typeof ccRqaApply==='function'){const f0=ccRqaApply;ccRqaApply=function(){read('rl');return f0.apply(this,arguments);};}
  if(typeof eaReset==='function'){const f0=eaReset;eaReset=function(){atF.ea='';return f0.apply(this,arguments);};}
  if(typeof ccRqaReset==='function'){const f0=ccRqaReset;ccRqaReset=function(){atF.rl='';return f0.apply(this,arguments);};}

  /* ── Checkboxes and the bar, drawn onto the list after it is drawn ── */
  const CSS='.bulk-th,.bulk-td{width:36px;padding-left:14px!important;padding-right:0!important;text-align:center}'
    +'.bulk-cb{width:16px;height:16px;margin:0;cursor:pointer;accent-color:var(--navy,#0f172a);vertical-align:middle}'
    +'.bulk-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:12px 0 0;padding:10px 14px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:var(--card,#fff)}'
    +'.bulk-bar-n{font-size:13px;font-weight:600;color:var(--navy,#0f172a)}.bulk-bar-sp{flex:1}'
    +'.bulk-bar .ep-cancel-btn,.bulk-bar .ep-save-btn{margin:0}'
    +'.bulk-bar-clear{background:none;border:0;padding:0;font:inherit;font-size:13px;font-weight:500;color:var(--gray,#6b7280);cursor:pointer}.bulk-bar-clear:hover{text-decoration:underline}'
    +'.bulk-note{font-size:13px;color:#6b7280;margin:3px 0 0}.bulk-list{margin:12px 0 0;padding:10px 12px;border:1px solid var(--border,#e5e7eb);border-radius:10px;background:#f8fafc;font-size:12.5px;color:var(--navy,#0f172a);max-height:120px;overflow:auto;line-height:1.6}';
  let drawing=false;
  function draw(){
    if(drawing)return;
    const w=which();
    const old=document.getElementById('bulk-bar');
    if(!w){if(old)old.remove();return;}
    drawing=true;
    try{
      if(!document.getElementById('bulk-css')){const st=document.createElement('style');st.id='bulk-css';st.textContent=CSS;document.head.appendChild(st);}
      const table=document.querySelector(L[w].table),list=selectable(w),ok={};
      list.forEach(function(it){ok[it.row]=it;});
      const keys=list.map(function(it){return it.k;});
      picked[w].forEach(function(k){if(keys.indexOf(k)<0)picked[w].delete(k);});
      const n=picked[w].size;
      /* The column: only when there is something this person can decide. */
      const has=!!table.querySelector('.bulk-th');
      if(list.length&&!has){
        const hr=table.querySelector('thead tr');
        if(hr)hr.insertAdjacentHTML('afterbegin','<th class="bulk-th"><input type="checkbox" class="bulk-cb" id="bulk-all" title="Select every request you can decide in this filter" aria-label="Select all" onclick="event.stopPropagation();emsBulkAll(this.checked)"></th>');
        table.querySelectorAll('tbody tr').forEach(function(tr){
          const it=ok[tr.id];
          if(!tr.id&&tr.children.length===1){const c=tr.children[0];c.colSpan=(c.colSpan||1)+1;return;}
          tr.insertAdjacentHTML('afterbegin','<td class="bulk-td" onclick="event.stopPropagation()">'+(it?'<input type="checkbox" class="bulk-cb" data-k="'+esc(it.k)+'" aria-label="Select '+esc(it.key)+'" onclick="event.stopPropagation();emsBulkPick(this)">':'')+'</td>');
        });
      }
      table.querySelectorAll('.bulk-cb[data-k]').forEach(function(cb){const on=picked[w].has(cb.getAttribute('data-k'));if(cb.checked!==on)cb.checked=on;});
      const all=document.getElementById('bulk-all');
      if(all){const full=list.length>0&&n===list.length;if(all.checked!==full)all.checked=full;const part=n>0&&!full;if(all.indeterminate!==part)all.indeterminate=part;}
      /* The bar. */
      if(!n){if(old)old.remove();}
      else{
        const html='<span class="bulk-bar-n">'+n+' of '+list.length+' selected</span>'
          +'<button type="button" class="bulk-bar-clear" onclick="emsBulkClear()">Clear selection</button><span class="bulk-bar-sp"></span>'
          +'<button type="button" class="ep-cancel-btn" onclick="emsBulkAsk(\'Reject\')">Reject</button>'
          +'<button type="button" class="ep-save-btn" onclick="emsBulkAsk(\'Approve\')">Approve</button>';
        let bar=old;
        const host=table.closest('.lp-split-wrap')||table;
        if(!bar||bar.nextElementSibling!==host){if(bar)bar.remove();bar=document.createElement('div');bar.id='bulk-bar';bar.className='bulk-bar';host.parentNode.insertBefore(bar,host);}
        if(bar.getAttribute('data-h')!==html){bar.innerHTML=html;bar.setAttribute('data-h',html);}
      }
    }catch(e){if(window.console)console.warn('[bulk decide]',e);}
    finally{drawing=false;}
  }
  window.emsBulkPick=function(cb){const w=which();if(!w)return;const k=cb.getAttribute('data-k');if(cb.checked)picked[w].add(k);else picked[w].delete(k);draw();};
  window.emsBulkAll=function(on){const w=which();if(!w)return;picked[w].clear();if(on)selectable(w).forEach(function(it){picked[w].add(it.k);});draw();};
  window.emsBulkClear=function(){const w=which();if(w)picked[w].clear();draw();};

  /* ── The popup: one comment for all ── */
  let ask=null;   // {w, decision, err}
  const root=function(){let el=document.getElementById('bulk-modal');if(!el){el=document.createElement('div');el.id='bulk-modal';document.body.appendChild(el);}return el;};
  const chosen=function(w){return selectable(w).filter(function(it){return picked[w].has(it.k);});};
  const stepIn=function(it){const st=caActiveStage(it.r);return !!st&&st.approvers.indexOf(me())<0;};
  function paint(){
    if(!ask){root().innerHTML='';return;}
    const items=chosen(ask.w),n=items.length,rej=ask.decision==='Reject',need=rej||items.some(stepIn);
    const X='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    root().innerHTML='<div class="ct-modal-overlay" style="z-index:2000" onclick="emsBulkClose()">'
      +'<div class="ct-modal" style="width:min(520px,95vw)" role="dialog" aria-modal="true" aria-label="'+ask.decision+' selected requests" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr" style="align-items:flex-start"><div><span class="ct-modal-title">'+ask.decision+' '+n+' request'+(n===1?'':'s')+'?</span>'
        +'<div class="bulk-note">'+(rej?'Each selected request is rejected with this reason.':'Each selected request moves to its next step, as when it is approved one by one.')+'</div></div>'
        +'<button class="ct-modal-close" onclick="emsBulkClose()" aria-label="Close">'+X+'</button></div>'
      +'<div class="bulk-list">'+items.map(function(it){return esc(it.key);}).join(', ')+'</div>'
      +'<div class="ep-form-group" style="margin-top:14px"><label class="ep-form-label">'+(rej?'Reason':'Comment')+(need?' <span class="req">*</span>':'')+'</label>'
        +'<textarea class="ep-form-input" id="bulk-comment" rows="3" style="height:auto;resize:vertical" placeholder="'+(rej?'Why these are rejected':'Written to every selected request')+'"></textarea>'
        +(ask.err?'<div style="font-size:12.5px;color:var(--st-bad-fg,#dc2626);margin-top:6px">'+esc(ask.err)+'</div>':'')+'</div>'
      +'<div class="ct-modal-foot"><span></span><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="emsBulkClose()">Cancel</button>'
        +'<button class="ep-save-btn" onclick="emsBulkGo()">'+ask.decision+' '+n+'</button></div></div>'
      +'</div></div>';
    const t=document.getElementById('bulk-comment');if(t){if(ask.text)t.value=ask.text;t.focus();}
  }
  window.emsBulkAsk=function(decision){const w=which();if(!w||!chosen(w).length)return;ask={w:w,decision:decision,err:'',text:''};paint();};
  window.emsBulkClose=function(){ask=null;paint();};
  window.emsBulkGo=function(){
    if(!ask)return;
    const w=ask.w,decision=ask.decision,items=chosen(w),t=document.getElementById('bulk-comment'),comment=String(t?t.value:'').trim();
    if(!comment&&(decision==='Reject'||items.some(stepIn))){
      ask.text='';ask.err=decision==='Reject'?'Enter the reason for rejecting.':'Enter a comment: you are deciding in another approver\'s place.';paint();return;
    }
    ask=null;paint();
    let done=0;const failed=[];
    items.forEach(function(it){
      let err;
      try{
        err=decision==='Approve'?caDecide(it.r.id,{scope:'claim',decision:'Approve',comment:comment,why:comment})
          :caDecide(it.r.id,{scope:'claim',decision:'Reject',reason:comment,why:comment});
      }catch(e){err=e&&e.message||'Could not be decided.';}
      if(err)failed.push(it.key+': '+err);else done++;
    });
    picked[w].clear();
    if(typeof presSaveSoon==='function')presSaveSoon();
    if(typeof renderADTPage==='function')renderADTPage();
    if(typeof showToast==='function'){
      const word=decision==='Approve'?'approved':'rejected';
      if(done)showToast(done+' request'+(done===1?'':'s')+' '+word,'success',failed.length?failed.length+' could not be decided: '+failed.slice(0,3).join(' · ')+(failed.length>3?' …':''):'');
      else showToast('Nothing was '+word,'error',failed.slice(0,3).join(' · '));
    }
  };
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ask)window.emsBulkClose();});

  /* Drawn after every repaint of the page (a filter, a page of the list, a decision). */
  const start=function(){
    let t=null;
    new MutationObserver(function(){if(drawing)return;clearTimeout(t);t=setTimeout(draw,30);}).observe(document.body,{childList:true,subtree:true});
    draw();
  };
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
