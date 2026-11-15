/* ══ EXPENSE ITEM: ADD COLUMN (product owner, 15 Nov 2026) ══════════════════════════════════════════════════════════
   "in each line item i want to give an add column as well and on clicking i want to open a column name and column
   value and if i want to add more column name and column value just i will click on add column."
   New Request → an expense item → Add Column: a Column Name and a Column Value, as many as needed, each with a remove
   button. They are saved with the item, where the item's other extra columns already live (line.cols), and are shown
   on the claim's panel with the item's fields.
   A row left completely empty is ignored; a value needs a name; a name is used once per item.
   Nothing else changes. In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof expLineFieldsHTML!=='function'||typeof expSyncLine!=='function')return;
  const esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const on=function(){return !(typeof presBuilding!=='undefined'&&presBuilding)&&typeof expModalOpen!=='undefined'&&expModalOpen&&typeof expDraft!=='undefined'&&!!expDraft&&typeof expDraft==='object';};
  /* The item being typed: expDraft.line - or expDraft itself while the form draws the item (js/expenses.js expWithLine). */
  const item=function(){return expDraft.line&&typeof expDraft.line==='object'?expDraft.line:expDraft;};
  const fixed=function(){return typeof EXP_CUSTOM_COLS!=='undefined'?EXP_CUSTOM_COLS:[];};
  const extra=function(cols){return Object.keys(cols||{}).filter(function(k){return fixed().indexOf(k)<0;});};
  /* The item's added columns: [{n, v}]; for an item opened again, read back from what was saved. */
  function rows(l){
    if(!Array.isArray(l.xc))l.xc=extra(l.cols).map(function(k){return {n:k,v:l.cols[k]};});
    return l.xc;
  }
  function read(){
    if(!on())return;
    const l=item(),x=rows(l);
    x.forEach(function(p,i){const a=document.getElementById('exp-l-xn-'+i),b=document.getElementById('exp-l-xv-'+i);if(a)p.n=a.value.trim();if(b)p.v=b.value.trim();});
    /* Saved with the item's other columns. */
    l.cols=l.cols||{};
    extra(l.cols).forEach(function(k){delete l.cols[k];});
    x.forEach(function(p){if(p.n&&fixed().indexOf(p.n)<0)l.cols[p.n]=p.v;});
  }
  const X='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const PLUS='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const l0=expLineFieldsHTML;
  expLineFieldsHTML=function(){
    const out=l0.apply(this,arguments);
    if(!on())return out;
    const x=rows(item());
    return out+'<div class="ep-form-group ep-form-full xc-box">'
      +(x.length?'<div class="xc-list">'+x.map(function(p,i){
        return '<div class="xc-row"><div class="ep-form-group"><label class="ep-form-label" for="exp-l-xn-'+i+'">Column Name</label><input class="ep-form-input" id="exp-l-xn-'+i+'" value="'+esc(p.n)+'" placeholder="Column Name" maxlength="40"></div>'
          +'<div class="ep-form-group"><label class="ep-form-label" for="exp-l-xv-'+i+'">Column Value</label><input class="ep-form-input" id="exp-l-xv-'+i+'" value="'+esc(p.v)+'" placeholder="Column Value" maxlength="120"></div>'
          +'<button type="button" class="xc-del" title="Remove this column" aria-label="Remove this column" onclick="emsXcRemove('+i+')">'+X+'</button></div>';
      }).join('')+'</div>':'')
      +'<button type="button" class="btn-outline btn-sm xc-add" onclick="emsXcAdd()">'+PLUS+' Add Column</button></div>';
  };
  const s0=expSyncLine;
  expSyncLine=function(){const out=s0.apply(this,arguments);read();return out;};
  const repaint=function(){if(typeof expRepaintForm==='function')expRepaintForm();else renderADTPage();};
  window.emsXcAdd=function(){
    if(!on())return;
    expSyncBasic();expSyncLine();
    rows(item()).push({n:'',v:''});repaint();
    const i=item().xc.length-1,el=document.getElementById('exp-l-xn-'+i);if(el)el.focus();
  };
  window.emsXcRemove=function(i){
    if(!on())return;
    expSyncBasic();expSyncLine();
    rows(item()).splice(i,1);read();repaint();
  };
  /* The item's own check, plus: a value needs a name, a name is used once. */
  if(typeof expCheckLine==='function'){
    const c0=expCheckLine;
    expCheckLine=function(d){
      const x=d&&Array.isArray(d.xc)?d.xc:[];
      const say=function(a,b){if(typeof showToast==='function')showToast(a,'error',b);return false;};
      const seen={};
      for(let i=0;i<x.length;i++){
        const n=String(x[i].n||'').trim(),v=String(x[i].v||'').trim();
        if(!n&&!v)continue;
        if(!n)return say('Column Name is required','Name the column for "'+v+'", or remove it.');
        if(fixed().indexOf(n)>=0)return say('Column already on the item','"'+n+'" is already a field of the item.');
        if(seen[n.toLowerCase()])return say('Column Name is used twice','"'+n+'" - use each name once per item.');
        seen[n.toLowerCase()]=true;
      }
      return c0.apply(this,arguments);
    };
  }
  /* The claim's panel: the added columns with the item's other fields. */
  if(typeof renderExpSidebar==='function'){
    const r0=renderExpSidebar;
    renderExpSidebar=function(){
      const out=r0.apply(this,arguments);
      if(typeof expTab==='undefined'||expTab!=='basic-details'||typeof expRec!=='function'||typeof axField!=='function')return out;
      const r=expRec(expSelectedId);if(!r||!(r.lines||[]).some(function(l){return extra(l.cols).length;}))return out;
      const box=document.createElement('div');box.innerHTML=out;
      box.querySelectorAll('.exp-line').forEach(function(card){
        const a=card.querySelector('.exp-line-amt'),m=a&&/-L(\d+)/.exec(a.textContent);if(!m)return;
        const l=r.lines.find(function(y){return y.id===Number(m[1]);}),grid=card.querySelector('.lp-sb-detail-grid');if(!l||!grid)return;
        const ico=typeof EXP_ICO!=='undefined'&&EXP_ICO.cols?EXP_ICO.cols:'';
        const t=document.createElement('div');t.innerHTML=extra(l.cols).map(function(k){return axField(ico,esc(k),esc(l.cols[k]));}).join('');
        const last=grid.lastElementChild;
        Array.prototype.slice.call(t.children).forEach(function(n){if(last)grid.insertBefore(n,last);else grid.appendChild(n);});
      });
      return box.innerHTML;
    };
  }
  (function(){
    if(document.getElementById('xc-style'))return;
    const st=document.createElement('style');st.id='xc-style';
    st.textContent='.xc-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:12px}'
      +'.xc-row{position:relative;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:14px 16px;background:#fff}'
      +'.xc-row .ep-form-group{margin:0}'
      +'.xc-del{position:absolute;top:-9px;right:-9px;width:22px;height:22px;border-radius:50%;border:0;background:#dc2626;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}'
      +'.xc-del:hover{background:#b91c1c}'
      +'.xc-box{display:block}.xc-add{display:inline-flex;align-items:center;gap:6px;width:auto}'
      +'@media(max-width:900px){.xc-list{grid-template-columns:1fr}}';
    (document.head||document.documentElement).appendChild(st);
  })();
})();
