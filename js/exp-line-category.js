/* ══ EACH EXPENSE ITEM HAS ITS OWN SUB CATEGORY (product owner, 12 Nov 2026) ══════════════════════════════════════
   "I should be able to change the sub category for each line item differently." One claim can hold a hotel night
   (Accommodation) and a breakfast (Meal Allowance): each item picks its own Sub Category and then its Expense Type.
   - Everywhere: capping limits are checked per Sub Category - each item under its own (epEvaluate); the budget check
     and the item checks already read the item's own Sub Category (js/expenses.js, js/budgets.js). A claim whose items
     share one Sub Category is checked exactly as before.
   - In the presentation's New Request form: the claim has no Sub Category field at the top; each item has one, before
     Expense Type. The claim's own Sub Category - used for its approval route and the list - is its first item's. */
(function(){
  if(typeof epEvaluate==='function'){
    const e0=epEvaluate;
    epEvaluate=function(ctx){
      const lines=(ctx&&ctx.lines)||[],groups={};
      lines.forEach(function(l){const c=l.category||ctx.category||'';(groups[c]=groups[c]||[]).push(l);});
      const keys=Object.keys(groups);
      if(keys.length<=1){
        if(keys.length===1&&keys[0]&&keys[0]!==ctx.category)return e0.call(this,Object.assign({},ctx,{category:keys[0]}));
        return e0.apply(this,arguments);
      }
      const out={results:[],blocked:false,needJust:[],split:[]},self=this;
      keys.forEach(function(k){
        const r=e0.call(self,Object.assign({},ctx,{category:k,lines:groups[k]}))||{};
        out.results=out.results.concat(r.results||[]);out.blocked=out.blocked||!!r.blocked;
        out.needJust=out.needJust.concat(r.needJust||[]);out.split=out.split.concat(r.split||[]);
        Object.keys(r).forEach(function(x){if(!(x in out))out[x]=r[x];});
      });
      return out;
    };
  }
  if(!/[?&]env=presentation/.test(location.search))return;
  const inModal=function(){return typeof expModalOpen!=='undefined'&&expModalOpen&&!!expDraft&&!expDraft.fromTxn&&!expDraft.cardLoad;};
  const cats=function(){return typeof capCategories==='function'?capCategories():(typeof EXP_CATEGORIES!=='undefined'?EXP_CATEGORIES:[]);};
  function claimCat(d){
    const l=(d.lines||[]).find(function(x){return x.category;})||(d.line&&d.line.category?d.line:null);
    return l?l.category:'';
  }
  /* The top of the claim: no Sub Category. */
  if(typeof expBasicFieldsHTML==='function'){
    const b0=expBasicFieldsHTML;
    expBasicFieldsHTML=function(){
      const out=b0.apply(this,arguments);
      if(!inModal())return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      tmp.querySelectorAll('.ep-form-group').forEach(function(g){
        const lab=g.querySelector(':scope > .ep-form-label');
        if(lab&&/^Sub Category\b/.test(lab.textContent.trim())&&g.querySelector('#csw-exp-e-cat'))g.remove();
      });
      return tmp.innerHTML;
    };
  }
  /* Each item: its Sub Category, before Expense Type; the Expense Types follow it. */
  if(typeof expLineFieldsHTML==='function'){
    const f0=expLineFieldsHTML;
    expLineFieldsHTML=function(cur,category){
      if(!inModal()||!expDraft||expDraft.lines)return f0.apply(this,arguments);   // drawn for an item (expDraft is the item here)
      const line=expDraft,lc=line.category||'';
      let out=f0.call(this,cur,lc);
      const field='<div class="ep-form-group"><label class="ep-form-label">Sub Category <span class="req">*</span></label>'
        +apCS('exp-l-cat',cats(),lc,'Select Sub Category','expLineCatPick')+'</div>';
      const at=out.indexOf('<label class="ep-form-label">Expense Type');
      const g=at>=0?out.lastIndexOf('<div class="ep-form-group',at):-1;
      return g>=0?out.slice(0,g)+field+out.slice(g):field+out;
    };
  }
  /* Read the item's Sub Category with its other fields; the claim's is its first item's. */
  if(typeof expSyncLine==='function'){
    const s0=expSyncLine;
    expSyncLine=function(){
      const out=s0.apply(this,arguments);
      if(document.getElementById('csw-exp-l-cat')&&inModal()){const t=expDraft.line;if(t)t.category=getCSValue('exp-l-cat')||t.category||'';}
      return out;
    };
  }
  if(typeof expSyncBasic==='function'){
    const sb=expSyncBasic;
    expSyncBasic=function(){
      const out=sb.apply(this,arguments);
      if(inModal()&&!document.getElementById('csw-exp-e-cat')){const c=claimCat(expDraft);if(c)expDraft.category=c;}
      return out;
    };
  }
  window.expLineCatPick=function(){
    if(!inModal())return;
    expSyncBasic();expSyncLine();
    const d=expDraft,l=d.line;
    if(l&&(EXP_SUBCATS[l.category]||[]).indexOf(l.subCat)<0)l.subCat='';
    const c=claimCat(d);if(c)d.category=c;
    expRepaintForm();
  };
  /* An added item: its Sub Category beside its Expense Type. */
  if(typeof expModalLinesHTML==='function'){
    const m0=expModalLinesHTML;
    expModalLinesHTML=function(d){
      let out=m0.apply(this,arguments);if(!inModal()||!d||!d.lines)return out;
      d.lines.forEach(function(l){
        if(!l.category||!l.subCat)return;
        out=out.replace(' · '+l.subCat+' · ',' · '+l.category+' / '+l.subCat+' · ');
      });
      return out;
    };
  }
})();
