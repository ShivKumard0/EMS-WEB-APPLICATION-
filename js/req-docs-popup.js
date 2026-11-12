/* ══ REQUIRED DOCUMENTS POPUP (dashboard only) ═════════════════════════════
   A third Dashboard preview switch in the profile menu, beside Onboarding
   tracker and Announcements. When it is on, opening the Dashboard brings up a
   popup listing the documents HR has asked this employee for, each with its
   own Upload button.

   It does not keep a list of its own: the documents are the employee's
   requested docs from the onboarding lifecycle (empReqDocs in
   employee-lifecycle.js), and Upload is the same picker My Profile ›
   Requested Docs uses (empPickRequested). An upload here therefore shows up
   in the profile, the tracker and Action Required too, and the last one in
   writes "Documents Submitted" exactly as it does from the profile.

   The popup lives inside the dashboard's content, so it is never shown on
   any other page. "Remind me later" closes it until the next visit to the
   Dashboard, or until the switch is turned on again. */

let rdShow=false;        // the switch (off: the dashboard opens as usual)
let rdLater=false;       // closed for this visit
let rdWasOpen=false;     // already on screen - a repaint should not replay the entrance

function rdDocs(){
  const emp=typeof empSelfRec==='function'?empSelfRec():null;
  return {emp:emp,docs:emp?empReqDocs(emp):[]};
}
const RD_DONE=['Uploaded','Accepted'];

function rdHTML(){
  const r=rdDocs(),emp=r.emp,docs=r.docs;
  const up=docs.filter(function(d){return RD_DONE.indexOf(d.status)>=0;}).length;
  const all=docs.length>0&&up===docs.length;
  const kind=emp?empKindOf(emp):'';
  const rows=docs.map(function(d){
    const can=d.status==='Pending Upload'||d.status==='Rejected';
    return '<div class="rd-row is-'+statusClass(d.status)+'">'
      +'<span class="rd-row-ico">'+EMP_ICO.doc+'</span>'
      +'<div class="rd-row-body"><div class="rd-row-name">'+empLifeHtml(d.name)+'</div>'
        +'<div class="rd-row-meta">'
          +(d.file?empLifeHtml(d.file)+(d.size?' · '+d.size:'')
            :d.status==='Rejected'?'<span class="rd-row-why">'+EMP_ICO.warn+'Rejected: '+empLifeHtml(d.reason||'—')+'</span>'
            :empLifeHtml(d.type||'Document'))
        +'</div></div>'
      +empDocBadge(d.status)
      +(can?'<button class="'+(d.status==='Rejected'?'ep-save-btn':'ep-cancel-btn')+' rd-up-btn" onclick="empPickRequested(\''+kind+'\','+emp.id+',\''+d.id+'\')">'
          +EMP_ICO.upload+(d.status==='Rejected'?'Re-upload':'Upload')+'</button>'
        :'<span class="rd-up-done" title="Uploaded">'+EMP_ICO.tick+'</span>')
      +'</div>';
  }).join('');
  const body=!docs.length
    ?'<div class="rd-empty"><span class="rd-empty-ico">'+EMP_ICO.tick+'</span>'
      +'<div class="rd-empty-title">No documents requested</div>'
      +'<p>HR has not asked you for any documents. You will be told here when they do.</p></div>'
    :'<div class="rd-progress"><div class="rd-progress-txt"><span><b>'+up+' of '+docs.length+'</b> uploaded</span>'
        +(all?'<span class="rd-progress-ok">All in — HR has been notified</span>':'')+'</div>'
      +'<div class="rd-bar"><span style="width:'+Math.round(up/docs.length*100)+'%"></span></div></div>'
      +'<div class="rd-list">'+rows+'</div>';
  return '<div class="rd-ov'+(rdWasOpen?' is-shown':'')+'" onclick="rdClose()">'
    +'<div class="rd-pop" role="dialog" aria-modal="true" aria-labelledby="rd-title" onclick="event.stopPropagation()">'
      +'<div class="rd-head"><span class="rd-head-ico">'+EMP_ICO.upload+'</span>'
        +'<div class="rd-head-txt"><h3 id="rd-title">Upload required documents</h3>'
        +'<p>HR needs these to continue your onboarding. PDF, JPG, PNG or Word, up to 5 MB each.</p></div>'
        +'<button class="rd-x" onclick="rdClose()" title="Close" aria-label="Close">'
          +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
      +body
      +'<div class="rd-foot">'
        +(docs.length?'<button class="rd-link" onclick="rdClose(true);empGoRequestedDocs()">View in My Profile</button>':'<span></span>')
        +'<button class="'+(all||!docs.length?'ep-save-btn':'ep-cancel-btn')+'" onclick="rdClose()">'+(all||!docs.length?'Done':'Remind me later')+'</button>'
      +'</div>'
    +'</div></div>';
}

/* Called from the dashboard branch of renderADTPage (renderer.js), so it is
   drawn into the dashboard and nowhere else, and redrawn - with the new
   statuses - after every upload. */
function rdRender(root){
  const host=root||document.getElementById('adt-content');if(!host)return;
  const old=host.querySelector('#rd-host');if(old)old.remove();
  if(!rdShow||rdLater||page!=='dashboard'){rdWasOpen=false;return;}
  const wrap=document.createElement('div');
  wrap.id='rd-host';wrap.innerHTML=rdHTML();
  host.appendChild(wrap);
  if(!rdWasOpen){
    // Next frame, so the entrance transition runs from the closed state.
    requestAnimationFrame(function(){const ov=wrap.querySelector('.rd-ov');if(ov)ov.classList.add('is-shown');});
    rdWasOpen=true;
  }
}
function rdClose(quiet){
  rdLater=true;rdWasOpen=false;
  const h=document.getElementById('rd-host');
  if(!h)return;
  const ov=h.querySelector('.rd-ov');
  if(quiet||!ov||matchMedia('(prefers-reduced-motion: reduce)').matches){h.remove();return;}
  ov.classList.remove('is-shown');
  setTimeout(function(){h.remove();},200);
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('rd-host'))rdClose();});

/* A fresh visit to the Dashboard asks again. navigatePage is wrapped rather
   than edited so this module stays self-contained. */
(function(){
  const nav=window.navigatePage;
  if(typeof nav!=='function')return;
  window.navigatePage=function(p){
    if(p==='dashboard'&&page!=='dashboard')rdLater=false;
    return nav.apply(this,arguments);
  };
})();
