/* ══ EMPLOYEES: BULK UPLOAD AND EXPORT IN THE TOP BAR (product owner, 14 Nov 2026) ══════════════════════════════════
   "move the bulk upload and export button at the top, on the side of the employee + button, just on the right of it".
   On the Employees list the two buttons sit in the top bar right after "Employees ⊕", in the same style as Expenses &
   Advances' Export Filtered, and are no longer shown beside Search. Same actions and the same rights as before: Bulk
   Upload for whoever may bulk upload (h2r.employee.bulk), Export of the list on screen (Direct or Global Employees).
   They show only while the list itself is on screen. In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const UP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  const DL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  /* 1 · Not beside Search any more (js/pages.js empExportBtn, with js/emp-plus-direct.js's Bulk Upload in front of it). */
  if(typeof empExportBtn==='function'){
    const x0=empExportBtn;
    empExportBtn=function(kind){return kind==='de'||kind==='ge'?'':x0.apply(this,arguments);};
  }
  /* 2 · In the top bar, right after the page's + */
  const kind=function(){return typeof empSubTab!=='undefined'&&empSubTab==='global'?'ge':'de';};
  function ensure(){
    if(document.getElementById('tb-emp-bulk-btn'))return true;
    const add=document.getElementById('tb-page-add-btn');if(!add)return false;
    const mk=function(id,label,ico,title,fn){
      const b=document.createElement('button');b.type='button';b.className='tb-opt-hol';b.id=id;b.style.display='none';b.title=title;
      b.innerHTML=ico+label;b.addEventListener('click',fn);return b;
    };
    const bulk=mk('tb-emp-bulk-btn','Bulk Upload',UP,'Add many employees from an Excel file',function(){if(typeof embOpen==='function')embOpen();});
    const exp=mk('tb-emp-export-btn','Export',DL,'Download this list as an Excel file',function(){if(typeof empExport==='function')empExport(kind());});
    add.insertAdjacentElement('afterend',exp);
    add.insertAdjacentElement('afterend',bulk);
    return true;
  }
  function update(){
    if(!ensure())return;
    const list=typeof page!=='undefined'&&page==='employees'&&!!(document.getElementById('csw-de-f-status')||document.getElementById('csw-ge-f-status'));
    const canBulk=typeof embOpen==='function'&&(typeof emsCan!=='function'||emsCan('h2r.employee.bulk'));
    document.getElementById('tb-emp-bulk-btn').style.display=list&&canBulk?'':'none';
    document.getElementById('tb-emp-export-btn').style.display=list?'':'none';
  }
  if(typeof renderADTPage==='function'){
    const r0=renderADTPage;
    renderADTPage=function(){const out=r0.apply(this,arguments);try{update();}catch(e){}return out;};
  }
})();
