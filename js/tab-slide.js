/* ==========================================================================
   SLIDING TAB MARKER  -  one marker that travels, in every tab bar.

   Seven bars in three shapes, all behaving the same way. This file only
   MEASURES: it finds the active tab, works out the rectangle its marker
   should occupy, and writes that as width/height/transform. The travel is a
   plain CSS transition (see the TAB BARS section of css/motion.css).

   THE PART THAT NEEDS EXPLAINING is that not every bar survives a tab click.
   The detail panels do, since isbTab() in js/core.js swaps only the panel
   body; the segmenteds do, since ciPick(), peoSelectRadio() and
   aiScopeModeApply() all just move a class; and the
   profile bar does, since setProfTab() swaps only .prof-tab-body. The rest -
   module tabs, both Company Settings bars - answer a click with
   renderADTPage() or an innerHTML swap that rebuilds the whole page. Their
   marker is therefore a BRAND NEW element by the time we are asked to move
   it, and a transition needs two states of one element.

   So each bar's last rectangle is remembered. When a bar comes back rebuilt,
   its fresh marker is planted at the remembered rectangle with transitions
   suppressed, one reflow forces that to count as the starting state, and only
   then is it given the new one. The rebuild becomes invisible.

   AND IT ONLY TRAVELS WHEN THE USER MOVED IT. Plenty of things rebuild these
   bars besides a tab click - a filter, a row action, opening a record. Those
   must place the marker, not fly it in from wherever the last page left it.
   A capture-phase listener on the tabs themselves arms the slide, running
   before the click's own handler tears anything down. Unarmed, the marker is
   simply put where it belongs.
   ========================================================================== */
(function(){
'use strict';

/* bar selector, tab selector, and the shape its marker takes.
     box    a 1.5px outline around the whole tab
     pill   a raised white tile behind the tab
     under  a bar along the tab's bottom edge, as thick as the border it
            replaces - read off the tab, so each bar keeps its own weight

   Not listed: .cs-tab-strip / .cs-sub-tabs. Both are styled in main.css but
   nothing in the app renders either of them any more - they are left over
   from an older Company Settings page, whose tabs are .lp-isb-tab today. */
var FAMILIES=[
  {bar:'.lp-isb-tabs',    tab:'.lp-isb-tab',      shape:'box'},
  {bar:'.mod-tabs',       tab:'.mod-tab',         shape:'pill'},
  {bar:'.segmented',      tab:'.seg-btn',         shape:'pill'},
  {bar:'.prof-tab-bar',   tab:'.prof-tab',        shape:'under'},
  {bar:'.pm-user-subtabs',tab:'.pm-user-subtab',  shape:'under'}
];
var TAB_SELECTOR=FAMILIES.map(function(f){return f.tab;}).join(',');

var lastRect={};   /* bar key -> the rectangle we last set for it */
var armed=false;   /* true only between a tab being clicked and its repaint */

/* offset* rather than getBoundingClientRect: these are content coordinates
   inside the scrollport, so a bar scrolled sideways does not shift the answer
   and the marker stays glued to its tab as the row scrolls. */
function rectFor(tab,shape){
  if(shape!=='under')
    return {x:tab.offsetLeft,y:tab.offsetTop,w:tab.offsetWidth,h:tab.offsetHeight};
  /* Sit exactly where the tab's own bottom border used to be drawn, at
     exactly its thickness - 2px here, 2.5px on the Company Settings strip. */
  var th=parseFloat(getComputedStyle(tab).borderBottomWidth)||2;
  return {x:tab.offsetLeft,y:tab.offsetTop+tab.offsetHeight-th,w:tab.offsetWidth,h:th};
}

function apply(ind,r){
  ind.style.width=r.w+'px';
  ind.style.height=r.h+'px';
  ind.style.transform='translate('+r.x+'px,'+r.y+'px)';
}

function same(a,b){return !!a&&!!b&&a.x===b.x&&a.y===b.y&&a.w===b.w&&a.h===b.h;}

function place(bar,fam,key){
  var tab=bar.querySelector(fam.tab+'.active');
  var ind=bar.querySelector(':scope > .tab-ind');

  if(!tab){if(ind)ind.classList.remove('on');return;}

  var fresh=false;
  if(!ind){
    ind=document.createElement('div');
    ind.className='tab-ind tab-ind--'+fam.shape+' no-anim';
    /* The page differ matches children by position and would treat this - a node
       no builder emits - as a surplus trailing child to be removed on every
       repaint. See patchVisible() in js/renderer.js. */
    ind.setAttribute('data-patch-keep','');
    bar.appendChild(ind);
    fresh=true;
  }

  var r=rectFor(tab,fam.shape);
  /* A bar with no width yet - inside a panel that has not opened, or a
     display:none branch - would poison the memory with zeroes. */
  if(!r.w){ind.classList.remove('on');return;}

  if(fresh){
    var prev=lastRect[key];
    apply(ind,(armed&&prev&&!same(prev,r))?prev:r);
    /* Read a layout property so the plant above counts as a real starting
       state; without it both writes coalesce and nothing animates. */
    void ind.offsetWidth;
    ind.classList.remove('no-anim');
  }

  apply(ind,r);
  ind.classList.add('on');
  lastRect[key]=r;
}

function sync(){
  for(var f=0;f<FAMILIES.length;f++){
    var fam=FAMILIES[f];
    var bars=document.querySelectorAll(fam.bar);
    for(var i=0;i<bars.length;i++)place(bars[i],fam,fam.bar+'#'+i);
  }
  armed=false;   /* one click buys one slide */
}

var queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(function(){queued=false;sync();});
}

function start(){
  /* Not scoped to #adt-content: .segmented also appears in the agent-side
     forms, which live outside it. */
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  /* CAPTURE phase, so this runs before the tab's own handler rebuilds
     anything. schedule() as well as arming: the bars that are NOT rebuilt
     only get a class moved, which a childList observer cannot see, and a
     click on the already-active tab changes nothing at all - without a sync
     to consume it the flag would sit armed and lend its slide to whatever
     repainted next. */
  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest(TAB_SELECTOR)){armed=true;schedule();}
  },true);
  /* A resized bar reflows its tabs under a marker that would otherwise stay
     put. Nothing rebuilds, so nothing else would notice. */
  window.addEventListener('resize',schedule);
  schedule();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
else start();

})();
