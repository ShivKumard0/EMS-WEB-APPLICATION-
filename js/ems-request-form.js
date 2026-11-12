/* ══ ONE REQUEST FORM: EXPENSE CLAIM OR ADVANCE (product owner, 10 Nov 2026) ══════════════════════════════════
   The + on Expenses & Advances opens one form. Claim For, Employee, Employee Id and Employee Email come first, then
   Category - Expense Claim or Advance - and Sub Category: Travel, Meal, Accommodation … for a claim, the advance type
   for an advance. The fields below follow the category: a claim's line items (each with its Expense Type), or the
   advance's amount, dates and purpose. Changing the category keeps who the request is for.
   Imprest (petty cash) is not part of it, and is not offered in client companies (not required). */
function emsReqCats(){
  const o=[];
  if(typeof caCan==='function'&&caCan('expense.claim.submit'))o.push('Expense Claim');
  if(typeof advCan==='function'&&(advCan('advance.create')||advCan('advance.create.others')))o.push('Advance');
  return o;
}
function emsReqCatField(cur){
  const cats=emsReqCats();
  return '<div class="ep-form-group"><label class="ep-form-label">Category <span class="req">*</span></label>'
    +(cats.length>1?apCS('ems-req-cat',cats,cur,'Select','emsReqCatPick'):'<input class="ep-form-input ca-ro" readonly value="'+attrSafe(cur)+'">')+'</div>';
}
/* Switch between the claim and the advance form, keeping Claim For and the employee. */
function emsReqCatPick(){
  const v=getCSValue('ems-req-cat');
  if(v==='Advance'&&typeof expModalOpen!=='undefined'&&expModalOpen&&expDraft&&!expDraft.fromTxn){
    if(typeof expSyncBasic==='function')expSyncBasic();
    const who={claimFor:expDraft.claimFor,eid:expDraft.eid};
    expModalOpen=false;expDraft=null;
    advStart();
    if(advForm&&who.claimFor==='Others'&&advCan('advance.create.others')){advForm.claimFor='Others';advForm.eid=who.eid||'';}
    renderADTPage();
  }else if(v==='Expense Claim'&&typeof advForm!=='undefined'&&advForm&&advForm.id==null){
    if(typeof advFormSync==='function')advFormSync();
    const who={claimFor:advForm.claimFor,eid:advForm.eid};
    advForm=null;
    startAddExpense();
    if(expDraft&&who.claimFor==='Others'&&caCan('expense.claim.create.others')){expDraft.claimFor='Others';expDraft.eid=who.eid||'';expDraft.name=who.eid?idEmpName(who.eid):'';}
    if(typeof expRepaintForm==='function')expRepaintForm();else renderADTPage();
  }
}
(function(){
  /* The claim popup: Category after Employee Email; a claim from a card payment stays an expense claim. */
  if(typeof expBasicFieldsHTML==='function'){
    const b0=expBasicFieldsHTML;
    expBasicFieldsHTML=function(){
      const out=b0.apply(this,arguments);
      if(!(typeof expModalOpen!=='undefined'&&expModalOpen&&expDraft))return out;
      const at='<div class="ep-form-group"><label class="ep-form-label">Sub Category <span class="req">*</span></label>';
      const i=out.indexOf(at);
      return i<0?out:out.slice(0,i)+(expDraft.fromTxn?'<div class="ep-form-group"><label class="ep-form-label">Category</label><input class="ep-form-input ca-ro" readonly value="Expense Claim"></div>'
        :emsReqCatField('Expense Claim'))+out.slice(i);
    };
  }
  if(typeof buildAddExpenseModalHTML==='function'){
    const m0=buildAddExpenseModalHTML;
    buildAddExpenseModalHTML=function(){
      const out=m0.apply(this,arguments);
      if(expDraft&&expDraft.fromTxn)return out;
      return out.replace('<span class="ct-modal-title">Add Expense</span>','<span class="ct-modal-title">New Request</span>')
        .replace('File an expense claim and the items it is made of.','Pick the category: an expense claim and the items it is made of, or an advance.')
        .replace('<div class="exp-modal-sec">Claim</div>','<div class="exp-modal-sec">Request</div>');
    };
  }
  /* The advance form: the same first fields, then Category and Sub Category (the advance type). */
  if(typeof advFormHTML==='function'){
    const a0=advFormHTML;
    advFormHTML=function(){
      let out=a0.apply(this,arguments);
      if(!advForm||advForm.id!=null)return out;
      out=out.replace('<label class="ep-form-label">Request For','<label class="ep-form-label">Claim For')
        .replace('<label class="ep-form-label">Advance Type','<label class="ep-form-label">Sub Category')
        .replace(/<div class="ep-form-group"><label class="ep-form-label">(Department|Designation|Reporting Manager)<\/label><input class="ep-form-input ca-ro" readonly value="[^"]*"><\/div>/g,'')
        .replace('<span class="ct-modal-title">Request Advance</span>','<span class="ct-modal-title">New Request</span>')
        .replace('>Select type</span>','>Select Sub Category</span>');
      const i=out.indexOf('<div class="ep-form-group"><label class="ep-form-label">Sub Category');
      return i<0?out:out.slice(0,i)+emsReqCatField('Advance')+out.slice(i);
    };
  }
  /* The + opens the form at once (no menu). */
  if(typeof eaPlusClick==='function'){
    eaPlusClick=function(){
      const cats=emsReqCats();
      if(!cats.length){emsDeny('create requests');return;}
      if(cats[0]==='Expense Claim')startAddExpense();else advStart();
    };
  }
  /* Client companies: no imprest (petty cash) - not in Manage, not in the type filter. */
  const client=function(){return typeof emsClientOnly==='function'&&emsClientOnly();};
  if(typeof eaActions==='function'){
    const x0=eaActions;
    eaActions=function(){const a=x0.apply(this,arguments);return client()?a.filter(function(x){return x[0]!=='Imprest Funds';}):a;};
  }
  if(typeof eaListHTML==='function'&&typeof EA_TYPES!=='undefined'){
    const l0=eaListHTML;
    eaListHTML=function(){
      if(!client()||EA_TYPES.indexOf('Imprest Request')<0)return l0.apply(this,arguments);
      const i=EA_TYPES.indexOf('Imprest Request');EA_TYPES.splice(i,1);
      try{return l0.apply(this,arguments);}finally{EA_TYPES.splice(i,0,'Imprest Request');}
    };
  }
})();
