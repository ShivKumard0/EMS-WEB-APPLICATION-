/* ══ NEW REQUEST: FIELD NAMES (product owner, 12 Nov 2026) ═════════════════════════════════════════════════════════
   "in Expenses & Advances, when we create a new request, rename Category (Expense Claim, Advance, Card Load) to Expense
   Type, and in the line item Sub Category as Category and Expense Type as Sub Category. Don't change the dropdown
   values." Names only, in the New Request form (claim, advance, card load) and its messages:
     Category (Expense Claim / Advance / Card Load)  → Expense Type
     item Sub Category (Travel, Meal …)              → Category
     item Expense Type (Flight Ticket, Taxi …)       → Sub Category
   14 Nov 2026 (product owner): "rename the subcategory to Expense category and Planned subcategory to Expense
   Subcategory" - in the advance form, Sub Category (the advance type) → Expense Category and Planned Sub Category
   (the budget line) → Expense Subcategory, with the matching placeholder and message.
   The values, the records and every other screen are unchanged. The form is redrawn in parts, so the names are applied
   to whatever is drawn inside it. In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const claimOpen=function(){return typeof expModalOpen!=='undefined'&&!!expModalOpen&&typeof expDraft!=='undefined'&&!!expDraft;};
  /* Claim (and card load, drawn from it): all three; advance: only the top field (its Sub Category is the advance type). */
  const MAP_CLAIM={'Category':'Expense Type','Sub Category':'Category','Expense Type':'Sub Category',
    'Select Expense Type':'Select Sub Category','Select Sub Category':'Select Category','Category / Expense Type':'Category / Sub Category','Pick a sub category first':'Pick a category first'};
  const MAP_ADV={'Category':'Expense Type','Sub Category':'Expense Category','Select Sub Category':'Select Expense Category',
    'Planned Sub Category':'Expense Subcategory'};
  const roots=function(){
    return Array.prototype.filter.call(document.querySelectorAll('.ct-modal'),function(m){
      const t=m.querySelector('.ct-modal-title');return !!t&&/^(New Request|Add Expense)$/.test(t.textContent.trim())&&!!m.querySelector('#csw-ems-req-cat, .ep-form-label');});
  };
  /* The first text of an element is its name; a name already given is kept (data-rl), and given again if a repaint put
     the old one back. */
  const rename=function(el,map){
    const t=Array.prototype.find.call(el.childNodes,function(n){return n.nodeType===3&&n.nodeValue.trim();});if(!t)return;
    const cur=t.nodeValue.trim();
    if(el.getAttribute('data-rl')===cur)return;
    const to=map[cur];if(!to)return;
    t.nodeValue=t.nodeValue.replace(cur,to);el.setAttribute('data-rl',to);
  };
  let busy=false;
  const apply=function(){
    if(busy)return;busy=true;
    try{
      roots().forEach(function(r){
        const map=claimOpen()?MAP_CLAIM:MAP_ADV;
        r.querySelectorAll('label.ep-form-label, .cs-trigger .cs-value, th').forEach(function(el){rename(el,map);});
        /* The form's opening line. */
        const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT,null);let n;
        while((n=w.nextNode()))if(n.nodeValue.indexOf('Pick the category:')>=0)n.nodeValue=n.nodeValue.replace('Pick the category:','Pick the expense type:');
      });
    }finally{busy=false;}
  };
  const start=function(){
    new MutationObserver(function(){if(!busy&&((typeof expModalOpen!=='undefined'&&expModalOpen)||(typeof advForm!=='undefined'&&advForm)))apply();})
      .observe(document.body,{childList:true,subtree:true,characterData:true});
  };
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
  /* The form's messages use the same names. */
  const advNew=function(){return !claimOpen()&&typeof advForm!=='undefined'&&!!advForm&&advForm.id==null;};
  const MSG_ADV={'Pick the advance type.':'Pick the Expense Category.'};
  const MSG_CLAIM={'Expense Type is required':'Sub Category is required','Sub Category is required':'Category is required','Category is required':'Expense Type is required','Pick the Sub Category first':'Pick the Category first'};
  if(typeof window.showToast==='function'){
    const s0=window.showToast;
    window.showToast=function(a){
      if(typeof a==='string'&&claimOpen()&&MSG_CLAIM[a]){const args=Array.prototype.slice.call(arguments);args[0]=MSG_CLAIM[a];return s0.apply(this,args);}
      if(advNew()){   // the advance form's messages: in the title or in the line under it
        const args=Array.prototype.slice.call(arguments);let hit=false;
        [0,2].forEach(function(i){if(typeof args[i]==='string'&&MSG_ADV[args[i]]){args[i]=MSG_ADV[args[i]];hit=true;}});
        if(hit)return s0.apply(this,args);
      }
      return s0.apply(this,arguments);
    };
  }
})();
