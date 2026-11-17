/* ══ COMPANY SETTINGS PANEL: NO PAYROLL, LEAVES OR ATTENDANCE TAB (product owner, 17 Nov 2026) ════════════════════
   "In the Dhi Hyperlocal entity in the super admin, and in company admin, in Administration → Company Settings, in
   the action button hide Payroll, Leaves, Attendance."
   Only the tabs drawn in the row's panel change, for the Super Admin in Dhi Hyperlocal (its own row and the sign-up
   rows) and for the Company Admin. What those tabs hold is kept and nothing reads it differently; every other tab,
   Edit and Save, and every other profile are untouched. Loaded after every other csVisibleTabs wrapper. */
(function(){
  const OFF=['payroll','leaves','attendance'];
  const role=function(){return typeof emsRoleLabel==='function'?emsRoleLabel():'';};
  const inHome=function(){return typeof ID_HOME_ENTITY!=='undefined'&&!!ID_HOME_ENTITY&&typeof idEntity==='function'&&idEntity()===ID_HOME_ENTITY;};
  const on=function(){try{const r=role();return r==='Company Admin'||(r==='Super Admin'&&inHome());}catch(e){return false;}};
  window.csTabsOff=function(){return on()?OFF:[];};
  if(typeof csVisibleTabs==='function'){
    const v0=csVisibleTabs;
    csVisibleTabs=function(){const t=v0.apply(this,arguments);return on()?t.filter(function(x){return OFF.indexOf(x.id)<0;}):t;};
  }
})();
