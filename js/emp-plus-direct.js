/* ══ EMPLOYEES: + ADDS AN EMPLOYEE, BULK UPLOAD BESIDE SEARCH (product owner, 12 Nov 2026) ══════════════════════════
   "when we click on + directly open add employee, remove add employee and bulk upload from there, and add the bulk
   employee adjacent right side of search button". On the Employees list the + opens Add Employee at once (no menu), and
   a Bulk Upload button sits right of Search, before Export, for whoever may bulk upload. In the presentation; Nova's
   own set-up keeps the menu it uses. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const building=function(){return typeof presBuilding!=='undefined'&&presBuilding;};
  if(typeof embPlusClick==='function'){
    const p0=embPlusClick;
    embPlusClick=function(){
      if(building())return p0.apply(this,arguments);
      if(typeof emsCan==='function'&&!emsCan('h2r.employee.create')){if(typeof emsDeny==='function')emsDeny('add employees');return;}
      addListingItem(page);
    };
  }
  const UP='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  if(typeof empExportBtn==='function'){
    const x0=empExportBtn;
    empExportBtn=function(kind){
      const out=x0.apply(this,arguments);
      const can=typeof emsCan!=='function'||emsCan('h2r.employee.bulk');
      if(!can||(kind!=='de'&&kind!=='ge')||typeof embOpen!=='function')return out;
      return '<button type="button" class="tsx-open-btn" onclick="embOpen()" title="Add many employees from an Excel file">'+UP+'Bulk Upload</button>'+out;
    };
  }
})();
