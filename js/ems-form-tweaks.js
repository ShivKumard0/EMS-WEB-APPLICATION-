/* ══ REQUEST FORM AND DUPLICATES (product owner, 12 Nov 2026) ══════════════════════════════════════════════════
   - No Cost Centre and no Project on the claim and advance forms. Budget lines are matched without them; values
     already on a record stay on it.
   - No Title and no Notes at the top of the New Request (claim) form: each expense item carries its own title and
     comments. The claim is named after its items - the first item's title, "+ n more" when there are several.
   - The expense items already added are clickable: a click brings the item back into the form to edit it (the item
     being typed, if any, is added first).
   - No duplicate check on expense claims or on card loads: the same amount, date and category - or the same card, wallet
     and amount - is accepted again without a warning or a reason. */
(function(){
  /* 1 · No Cost Centre and no Project on the claim and advance forms (product owner, 12 Nov 2026). Values already on a
     record stay on it. */
  if(typeof bgDimSelects==='function')bgDimSelects=function(){return '';};
  /* 2 · No Title or Notes at the top of the New Request form */
  const strip=function(html){
    return html.replace(/<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="exp-e-title">[\s\S]*?<\/div>/,'')
      .replace(/<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="exp-e-notes">[\s\S]*?<\/textarea><\/div>/,'');
  };
  if(typeof expBasicFieldsHTML==='function'){
    const b0=expBasicFieldsHTML;
    expBasicFieldsHTML=function(){const out=b0.apply(this,arguments);return typeof expModalOpen!=='undefined'&&expModalOpen&&expDraft?strip(out):out;};
  }
  if(typeof submitAddExpense==='function'){
    const s0=submitAddExpense;
    submitAddExpense=function(){
      if(typeof expModalOpen!=='undefined'&&expModalOpen&&expDraft&&!String(expDraft.title||'').trim()){   // the form asks no title
        expSyncLine();
        const d=expDraft,ls=d.lines.concat(expLineTouched(d.line)?[d.line]:[]).filter(function(l){return String(l.title||'').trim();});
        d.title=ls.length?String(ls[0].title).trim()+(ls.length>1?' + '+(ls.length-1)+' more':''):(d.category||'Expense claim');
      }
      return s0.apply(this,arguments);
    };
  }
  /* 3 · Click an added item to edit it */
  if(typeof expModalLinesHTML==='function'){
    const l0=expModalLinesHTML;
    expModalLinesHTML=function(d){
      let i=0;
      return l0.apply(this,arguments)
        .replace(/<div class="exp-line exp-mline">/g,function(){const k=i++;return '<div class="exp-line exp-mline" style="cursor:pointer" title="Click to edit this item" onclick="expEditModalLine('+k+')">';})
        .replace(/onclick="expRemoveModalLine\(/g,'onclick="event.stopPropagation();expRemoveModalLine(');
    };
  }
  /* 4 · No duplicate check on claims or card loads */
  if(typeof caDupMatches==='function')caDupMatches=function(){return [];};
  if(typeof ccLoadCheck==='function'){
    const c0=ccLoadCheck;
    ccLoadCheck=function(){
      const out=c0.apply(this,arguments);
      if(out&&out.errors){out.errors=out.errors.filter(function(e){return !/^Possible duplicate of /.test(e);});delete out.dup;}
      return out;
    };
  }
})();
/* Bring an added expense item back into the form to edit it. */
function expEditModalLine(i){
  expSyncBasic();expSyncLine();
  const d=expDraft;if(!d||!d.lines[i])return;
  if(expLineTouched(d.line)){
    if(!expWithLine(function(){return expCheckLine(d.line,d.category);}))return;   // the item being typed is added first
    d.lines.push(Object.assign({},d.line,{cols:Object.assign({},d.line.cols)}));
  }
  const l=d.lines.splice(i,1)[0];
  d.line=Object.assign({},l,{cols:Object.assign({},l.cols||{})});
  expRepaintForm();
}
