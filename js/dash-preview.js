/* ══ DASHBOARD PREVIEW SWITCHES (profile menu) ═════════════════════════════
   Two demo switches for the employee dashboard, so its states can be shown
   without editing data:

     tracker        on  the onboarding tracker is shown (lifecycle running)
                    off onboarding is complete: no tracker, and its rows leave
                        Action Required
     announcements  on  the posts from HR and the manager
                    off none posted: the "all caught up" state

   The state itself lives with its module (empTrackerShow in
   employee-lifecycle.js, annShow in announcements.js), so a later visit to
   the dashboard renders the chosen state. This file only flips it, keeps the
   menu rows in step, and plays the change on the dashboard if it is open. */

const DP_ITEMS={
  tracker:{
    get:function(){return empTrackerShow;},
    set:function(v){empTrackerShow=v;},
    apply:function(){
      const host=document.getElementById('emp-life-dash');
      if(!host)return;
      host.classList.toggle('is-off',!empTrackerShow);
      empDashActionRows(host.closest('#employee-view'),true);
    }
  },
  announcements:{
    get:function(){return annShow;},
    set:function(v){annShow=v;},
    apply:function(){if(document.getElementById('emp-ann-dash'))annSwap();}
  },
  /* reqdocs      on  the Dashboard opens with the Upload required documents
                      popup (js/req-docs-popup.js)
                  off the Dashboard opens as usual */
  reqdocs:{
    get:function(){return rdShow;},
    set:function(v){rdShow=v;rdLater=false;},
    apply:function(){if(page==='dashboard')rdRender();}
  }
};

function dpToggle(key,ev){
  if(ev)ev.stopPropagation();
  const it=DP_ITEMS[key];if(!it)return;
  it.set(!it.get());
  dpSync(key);
  it.apply();
}

/* The row says what the switch means right now, in its sub-line, and the
   switch, icon tile and line all move together. */
function dpSync(key){
  const row=document.getElementById('dp-'+key);if(!row)return;
  const on=DP_ITEMS[key].get();
  row.classList.toggle('is-on',on);
  row.setAttribute('aria-checked',String(on));
}

(function(){
  const start=function(){Object.keys(DP_ITEMS).forEach(dpSync);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
