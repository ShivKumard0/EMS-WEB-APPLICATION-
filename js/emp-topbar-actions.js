/* ══ EMPLOYEES: BULK UPLOAD AND EXPORT IN THE TOP BAR (product owner, 14 Nov 2026) ══════════════════════════════════
   "move the bulk upload and export button at the top, on the side of the employee + button, just on the right of it".
   On the Employees list the two sit in the top bar right after "Employees ⊕" as plain text with the icon after it, the way
   "Employees ⊕" reads (product owner: "remove the button … text first then its icon, then gap, then export"), and are no
   longer shown beside Search. Same actions and the same rights as before: Bulk
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
  /* Plain text in the title's font (14px, 600, navy), icon after the text; the accent colour on hover. */
  const CSS='.tb-emp-link{display:inline-flex;align-items:center;gap:6px;background:none;border:0;padding:0;margin:0 0 0 14px;font-family:inherit;'
    +'font-size:14px;font-weight:600;line-height:20px;color:var(--navy);cursor:pointer;white-space:nowrap}'
    +'.tb-emp-link:hover{color:var(--btn-accent)}.tb-emp-link:focus-visible{outline:2px solid var(--btn-accent);outline-offset:3px;border-radius:4px}'
    +'.tb-emp-link svg{width:15px;height:15px;flex-shrink:0}#tb-emp-export-btn{margin-left:18px}';
  function ensure(){
    if(document.getElementById('tb-emp-bulk-btn'))return true;
    if(!document.getElementById('tb-emp-link-css')){const st=document.createElement('style');st.id='tb-emp-link-css';st.textContent=CSS;document.head.appendChild(st);}
    const add=document.getElementById('tb-page-add-btn');if(!add)return false;
    const mk=function(id,label,ico,title,fn){
      const b=document.createElement('button');b.type='button';b.className='tb-emp-link';b.id=id;b.style.display='none';b.title=title;
      b.innerHTML='<span>'+label+'</span>'+ico;b.addEventListener('click',fn);return b;
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
