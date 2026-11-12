/* ==========================================================================
   LISTING FIT  -  Expense Management and RBAC Templates listings (8 Nov 2026)

   The shared listing card is overflow:clip (main.css): a table wider than its
   card is cut off under the pinned Action column. For these listings the card
   may scroll sideways (css/expenses.css, css/wallet-benefits.css,
   css/rbac-templates.css), but a tall card's scrollbar sits below the screen,
   so first the table should simply fit.

   It fits by letting its text cells wrap to two lines - but ONLY when the
   one-line table is wider than its card. Allowing wrap on a table that already
   fits makes the browser re-balance its columns (a column can lose half its
   width while another grows), so a table that fits must keep its one-line
   layout. CSS cannot tell whether a table fits; this file can, and that is all
   it does: it marks such a table .is-tight, and the stylesheets wrap only
   .is-tight tables. Reports (.adv-report) are wide grids that scroll by design
   and are left alone.

   Re-measured after every repaint (#adt-content is rewritten wholesale - a
   childList observer sees that) and on window resize, plus once more after the
   detail panel's 280 ms opening transition. Only a class is written, which a
   childList observer cannot see, so nothing feeds back.
   ========================================================================== */
(function(){
'use strict';

var TABLES='.lp-table.exp-table,.lp-table.cap-table,.lp-table.rb-table,.lp-table.wb-table';

function fit(t){
  var c=t.closest('.lp-table-card');
  if(!c||c.classList.contains('adv-report'))return;
  var was=t.classList.contains('is-tight');
  if(was)t.classList.remove('is-tight');          // measure the one-line table
  var need=t.scrollWidth>c.clientWidth+1;
  if(need)t.classList.add('is-tight');
}

function fitAll(){
  var root=document.getElementById('adt-content');
  if(!root)return;
  var ts=root.querySelectorAll(TABLES);
  for(var i=0;i<ts.length;i++)fit(ts[i]);
}

var queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(function(){queued=false;fitAll();});
}
function settle(){fitAll();schedule();setTimeout(fitAll,320);}

window.addEventListener('resize',schedule);

function start(){
  var root=document.getElementById('adt-content');
  if(!root){setTimeout(start,50);return;}
  new MutationObserver(settle).observe(root,{childList:true,subtree:true});
  settle();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
else start();

window.listingFitAll=fitAll;
})();
