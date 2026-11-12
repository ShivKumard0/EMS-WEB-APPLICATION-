/* ══ CREATE / EDIT FORMS AS PAGES ════════════════════════════════════════
   Every create and edit form in the app is built as a .ct-modal--form popup
   (Create Template, Add Asset, Create Ticket, Create Pay Run…). They are now
   shown the way the contract request forms are: as a page in the content
   area, with Back and a page title on top, the fields in a card, and the
   actions underneath - the sidebar and top bar stay where they are.

   Nothing about a form changes. It is still built by its module, keeps its
   ids, validation and Save / Cancel handlers, and closes the way it always
   did. This file only re-presents it:
     - the overlay is pinned over the content area instead of the screen,
     - the close (x) becomes "Back" above the title,
     - the fields between the header and the actions are wrapped in a card,
     - the top bar title names the form while it is open.
   A MutationObserver picks up each form as it is rendered, so modules do not
   have to call anything. */

/* Popups that stay popups: a picker opened on top of another form. */
const FP_SKIP='.emp-asg';
const FP_BACK_ICO='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
let fpTitleWas=null;

/* The content area's box, for the overlay to cover exactly. */
function fpPlace(){
  const c=document.getElementById('adt-content');if(!c)return;
  const r=c.getBoundingClientRect(),s=document.documentElement.style;
  s.setProperty('--fp-top',r.top+'px');s.setProperty('--fp-left',r.left+'px');
  s.setProperty('--fp-w',r.width+'px');s.setProperty('--fp-h',r.height+'px');
}

/* The element holding the form's actions: the shared footer, or the last
   child that carries the Save / Cancel buttons. */
function fpFooterOf(modal){
  const foot=modal.querySelector(':scope > .ct-modal-foot');
  if(foot)return foot;
  const kids=Array.prototype.slice.call(modal.children);
  for(let i=kids.length-1;i>=0;i--){
    const k=kids[i];
    if(k.querySelector('input,textarea,select,.cs-wrap,.cd-wrap'))return null;
    if(k.matches('.ep-save-btn,.ep-cancel-btn')||k.querySelector('.ep-save-btn,.ep-cancel-btn,.lp-logs-save-btn'))return k;
  }
  return null;
}

/* A title's own words, without the chips some titles carry beside them. */
function fpTitleText(el){
  const own=Array.prototype.filter.call(el.childNodes,function(n){return n.nodeType===3;}).map(function(n){return n.textContent;}).join('').trim();
  return own||el.textContent.trim();
}
function fpConvert(modal){
  modal.classList.add('fp-done');
  const overlay=modal.closest('.ct-modal-overlay');
  if(overlay)overlay.classList.add('fp-page');
  /* .fp-head: a header row holding the title (and sub-line) on the left and
     status tiles on the right, the way a listing page sets its tiles beside
     its filters - Create New Leave's leave balance. */
  const hdr=modal.querySelector(':scope > .ct-modal-hdr, :scope > .fp-head .ct-modal-hdr');
  const close=hdr&&hdr.querySelector('.ct-modal-close');
  /* Back above the title does what the x did. */
  if(hdr&&!modal.querySelector(':scope > .fp-top')){
    const top=document.createElement('div');
    top.className='fp-top';
    const back=document.createElement('button');
    back.type='button';back.className='ep-back fp-back';back.innerHTML=FP_BACK_ICO+' Back';
    back.onclick=function(){if(close)close.click();};
    top.appendChild(back);
    modal.insertBefore(top,modal.firstChild);
  }
  /* Everything between the header (and its sub-line) and the actions goes
     into one card. */
  const foot=fpFooterOf(modal);
  if(foot)foot.classList.add('fp-foot');
  const body=Array.prototype.filter.call(modal.children,function(k){
    return k!==foot&&!k.matches('.fp-top,.fp-head,.ct-modal-hdr,.ct-modal-sub,.fp-card');
  });
  /* A form whose body is already one bordered panel (the leave policy's
     sectioned card) keeps it as its card rather than nesting it in another. */
  const own=body.length===1&&parseFloat(getComputedStyle(body[0]).borderTopWidth)>0;
  if(own)body[0].classList.add('fp-card-own');
  else if(body.length){
    const card=document.createElement('section');
    card.className='fp-card';
    modal.insertBefore(card,body[0]);
    body.forEach(function(k){card.appendChild(k);});
  }
  /* The top bar names the form, the way it names a contract request page. */
  const t=document.getElementById('adt-page-title');
  const name=hdr&&hdr.querySelector('.ct-modal-title');
  if(t&&name){
    if(fpTitleWas==null)fpTitleWas=t.textContent;
    t.textContent=fpTitleText(name);
  }
  document.body.classList.add('fp-on');
  fpPlace();
  const m=modal;requestAnimationFrame(function(){m.scrollTop=0;});
}

function fpScan(){
  document.querySelectorAll('.ct-modal--form:not(.fp-done)').forEach(function(m){
    if(m.matches(FP_SKIP))return;
    fpConvert(m);
  });
  /* A repaint of the page underneath resets the top bar title; keep it on
     the open form. */
  const open=document.querySelector('.ct-modal-overlay.fp-page .ct-modal-hdr .ct-modal-title');
  const t0=document.getElementById('adt-page-title');
  if(open&&t0&&t0.textContent!==fpTitleText(open))t0.textContent=fpTitleText(open);
  /* The last form closed: the top bar goes back to the page it is on. */
  if(document.body.classList.contains('fp-on')&&!document.querySelector('.ct-modal-overlay.fp-page')){
    document.body.classList.remove('fp-on');
    const t=document.getElementById('adt-page-title');
    if(t&&fpTitleWas!=null&&typeof getPageTitle==='function'&&typeof page!=='undefined')t.textContent=getPageTitle(page);
    fpTitleWas=null;
  }
}

(function(){
  const start=function(){
    /* Observer callbacks run before the next paint, so a form is never seen
       as a popup first. */
    new MutationObserver(fpScan)
      .observe(document.body,{childList:true,subtree:true});
    window.addEventListener('resize',fpPlace);
    const c=document.getElementById('adt-content');
    if(c&&window.ResizeObserver)new ResizeObserver(fpPlace).observe(c);
    fpScan();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
