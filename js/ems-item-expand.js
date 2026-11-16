/* New Request: a saved expense item opens to show its details (product owner, 16 Nov 2026).
   "When I click on the 1st line item it should expand and I can see the details as well."
   An item already added to the request is a one-line row. Clicking the row opens it: every detail that was filled in,
   laid out like the item form, to read. Clicking again closes it. The bin still removes the item.
   Until now a click on the row moved the item straight back into the form to edit it (js/ems-form-tweaks.js); that is
   now the Edit Item button inside the opened details, and works exactly as before.
   Display only: the item, the request, submission and approval are unchanged. */
(function(){
  if(typeof expModalLinesHTML!=='function')return;
  const E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const CH='<svg class="xle-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
  (function css(){
    if(document.getElementById('xle-style'))return;
    const st=document.createElement('style');st.id='xle-style';
    st.textContent='.exp-mline.xle>.exp-line-hd{cursor:pointer}'
      +'.xle-chev{flex:none;color:var(--gray,#6a7282);transition:transform .18s ease;margin-right:4px}.exp-mline.xle.is-open .xle-chev{transform:rotate(180deg)}'
      +'.xle-body{display:none;margin-top:12px;padding-top:14px;border-top:1px solid var(--border,#e5e7eb)}.exp-mline.xle.is-open .xle-body{display:block}'
      +'.xle-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px 16px}'
      +'.xle-acts{display:flex;justify-content:flex-end;margin-top:14px}'
      +'.xle-f{min-width:0}.xle-f.is-2{grid-column:span 2}.xle-f.is-3{grid-column:span 3}'
      +'.xle-l{font-size:12px;font-weight:500;color:var(--gray,#6a7282);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.xle-v{font-size:13.5px;font-weight:500;color:var(--navy,#0f172a);line-height:1.45;overflow-wrap:anywhere}'
      +'@media (max-width:1179px){.xle-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.xle-f.is-2,.xle-f.is-3{grid-column:span 2}}';
    (document.head||document.documentElement).appendChild(st);
  })();
  function details(d,l,i){
    const F=function(label,val,span){
      const v=val==null||String(val).trim()===''?'<span style="color:var(--gray,#6a7282);font-weight:400">—</span>':val;
      return '<div class="xle-f'+(span?' is-'+span:'')+'"><div class="xle-l">'+E(label)+'</div><div class="xle-v">'+v+'</div></div>';
    };
    const money=function(n){return typeof expMoney==='function'?expMoney(n,d.currency):E(n);};
    const day=function(x){return x?(typeof cdLabel==='function'?cdLabel(x):x):'';};
    let h=F('Expense Title',E(l.title))+F('Amount Spent',money(l.amount))+F('Category',E(l.category||d.category||''))+F('Sub Category',E(l.subCat))+F('Expense Paid By',E(l.paidBy));
    if(l.paidBy==='Company Advance'&&l.advanceId)h+=F('Advance Reference',E(typeof advRefLabel==='function'?advRefLabel(l.advanceId):l.advanceId))+F('Advance-Funded Amount',money(l.advAmount));
    if(l.paidBy==='Corporate Card'&&l.cardId&&typeof ccCard==='function'&&ccCard(l.cardId))h+=F('Card',E(typeof ccMask==='function'?ccMask(ccCard(l.cardId).last4):''));
    h+=F('Merchant / Vendor',E(l.merchant),2)+F('Invoice / Receipt No.',E(l.invoice));
    const cols=l.cols&&typeof l.cols==='object'&&!Array.isArray(l.cols)?l.cols:{};
    const fixed=typeof EXP_CUSTOM_COLS!=='undefined'?EXP_CUSTOM_COLS:[];
    fixed.forEach(function(c){h+=F(c,E(cols[c]));});
    Object.keys(cols).forEach(function(c){if(fixed.indexOf(c)<0&&String(cols[c]||'').trim())h+=F(c,E(cols[c]));});
    h+=F('Date',E(day(l.start)+(l.end&&l.end!==l.start?' – '+day(l.end):'')))+F('Expense Proof',E(l.proof),2)+F('Description',E(l.comments),3);
    return '<div class="xle-body"><div class="xle-grid">'+h+'</div>'
      +(typeof expEditModalLine==='function'?'<div class="xle-acts"><button type="button" class="btn-outline btn-sm" onclick="event.stopPropagation();expEditModalLine('+i+')">Edit Item</button></div>':'')+'</div>';
  }
  const m0=expModalLinesHTML;
  expModalLinesHTML=function(d){
    const out=m0.apply(this,arguments);
    try{
      if(!out||!d||!d.lines||!d.lines.length)return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      const rows=tmp.querySelectorAll('.exp-mline');
      if(rows.length!==d.lines.length)return out;
      const open=d.openLines||{};
      rows.forEach(function(row,i){
        const hd=row.querySelector('.exp-line-hd');if(!hd)return;
        row.classList.add('xle');if(open[i])row.classList.add('is-open');
        row.removeAttribute('onclick');row.removeAttribute('title');row.style.cursor='';   // the row opens; Edit Item edits
        hd.setAttribute('onclick','emsItemToggle(event,'+i+')');hd.setAttribute('title','Show or hide the details');
        const bin=hd.querySelector('button');
        const c=document.createElement('span');c.innerHTML=CH;
        if(bin)hd.insertBefore(c.firstChild,bin);else hd.appendChild(c.firstChild);
        row.insertAdjacentHTML('beforeend',details(d,d.lines[i],i));
      });
      return tmp.innerHTML;
    }catch(e){return out;}
  };
  window.emsItemToggle=function(ev,i){
    if(ev&&ev.target&&ev.target.closest&&ev.target.closest('button'))return;   // the bin
    const row=ev&&ev.currentTarget?ev.currentTarget.closest('.exp-mline'):null;if(!row)return;
    const on=row.classList.toggle('is-open');
    if(typeof expDraft!=='undefined'&&expDraft){expDraft.openLines=expDraft.openLines||{};if(on)expDraft.openLines[i]=true;else delete expDraft.openLines[i];}
  };
  if(typeof expEditModalLine==='function'){
    const e0=expEditModalLine;
    expEditModalLine=function(){if(typeof expDraft!=='undefined'&&expDraft)expDraft.openLines={};return e0.apply(this,arguments);};
  }
  /* removing an item: the rows after it move up, so nothing stays open by mistake */
  if(typeof expRemoveModalLine==='function'){
    const r0=expRemoveModalLine;
    expRemoveModalLine=function(){if(typeof expDraft!=='undefined'&&expDraft)expDraft.openLines={};return r0.apply(this,arguments);};
  }
})();
