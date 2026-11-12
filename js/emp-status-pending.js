/* ══ ADD EMPLOYEE: ALWAYS PENDING (product owner, 12 Nov 2026) ══════════════════════════════════════════════════════
   "when we create an employee it will be in pending status by default, then we will complete onboarding, then active -
   remove those 2 boxes". Add Employee has no Employee Status choice: every new employee is created Pending and is moved
   on to Onboarding and then Active from their Logs, as before. In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof EA_STEPS!=='undefined')EA_STEPS.forEach(function(s){
    if(Array.isArray(s.fields))s.fields=s.fields.filter(function(f){return f.k!=='status';});
  });
  if(typeof eaDefaults==='function'){
    const d0=eaDefaults;
    eaDefaults=function(){const d=d0.apply(this,arguments);if(d&&!d.status)d.status='Pending';return d;};
  }
})();
