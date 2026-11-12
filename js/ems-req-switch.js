/* ══ NEW REQUEST: A SMOOTH CATEGORY SWITCH (product owner, 12 Nov 2026) ══════════════════════════════════════════
   "when i switch between categories make the transition look smooth … every time it's like a new page is opening".
   Switching Category (Expense Claim · Advance · Card Load) keeps the page still: the page entrance does not replay,
   the form keeps its scroll position, the top (Back, title, note, Claim For … Category) stays where it is, and only
   the part that changed - the fields below Category, the buttons, and the note when its words change - fades in.
   The advance form carries the same "Request" heading over its fields as the claim form, so the top does not shift. */
function emsReqFormEl(){return document.querySelector('.ct-modal-overlay .ct-modal--form');}
/* Everything after the Category field: its later neighbours in the grid, then the later neighbours of each box
   around it, up to the form (the line items, the buttons). */
function emsReqBelow(f){
  const cat=document.getElementById('csw-ems-req-cat'),g=cat&&cat.closest('.ep-form-group');
  if(!f||!g||!f.contains(g))return [];
  const out=[];let n=g;
  while(n&&n!==f){let s=n.nextElementSibling;while(s){out.push(s);s=s.nextElementSibling;}n=n.parentElement;}
  return out;
}
function emsReqFadeIn(els){
  if(!els.length||typeof Element.prototype.animate!=='function')return;
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const css=getComputedStyle(document.documentElement),ease=(css.getPropertyValue('--e-out')||'').trim()||'ease-out';
  els.forEach(function(e){e.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:200,easing:ease});});
}
(function(){
  /* The advance form: the same "Request" heading over its fields as the claim form. */
  if(typeof advFormHTML==='function'){
    const a0=advFormHTML;
    advFormHTML=function(){
      const out=a0.apply(this,arguments);
      if(!advForm||advForm.id!=null||out.indexOf('<div class="exp-modal-sec">')>=0)return out;
      const i=out.indexOf('<div class="ep-form-grid"');
      return i<0?out:out.slice(0,i)+'<div class="exp-modal-sec">Request</div>'+out.slice(i);
    };
  }
  if(typeof emsReqCatPick!=='function')return;
  const p0=emsReqCatPick;
  emsReqCatPick=function(){
    const f0=emsReqFormEl(),y=f0?f0.scrollTop:0,s0=document.querySelector('.ct-modal-overlay .ct-modal-sub'),sub0=s0?s0.textContent:'';
    const content=document.getElementById('adt-content');
    if(content)content.classList.add('m-quiet');   // the page entrance does not replay for this repaint
    let out;
    try{out=p0.apply(this,arguments);}
    finally{setTimeout(function(){if(content)content.classList.remove('m-quiet');},60);}
    /* After the form is re-presented as a page (its observer runs first and scrolls a new form to the top) and
       before the next paint: put the scroll back and fade in what changed. */
    Promise.resolve().then(function(){
      requestAnimationFrame(function(){
        const f=emsReqFormEl();if(!f)return;
        if(f.scrollTop!==y)f.scrollTop=y;
        const els=emsReqBelow(f),s=f.querySelector('.ct-modal-sub');
        if(s&&s.textContent!==sub0)els.push(s);
        emsReqFadeIn(els);
      });
    });
    return out;
  };
})();
