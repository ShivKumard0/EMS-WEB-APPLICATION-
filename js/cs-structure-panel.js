/* ══ COMPANY STRUCTURE BACK IN COMPANY SETTINGS (product owner, 12 Nov 2026) ═════════════════════════════════════════
   "remove the company structure from the side bar and keep it inside the action button of Administration → Company
   Settings, and in company settings show branch, department, designations". In a client company (Nova Retail), for
   everyone: the sidebar has no Company Structure item; the company's ☰ panel has a Company Structure tab (after
   Banking Details) with Branch · Departments · Designation. The lists, forms and saves are the existing ones
   (attendance-settings.js, cs-structure.js); the Branch list reads Sr. No · Branch Name · Location · Status · Action
   (Radius stays in the form), and departments and designations are listed A–Z. Opening the old page goes to the tab.
   The company's own set-up in the presentation still uses the page while it builds. In the presentation; the platform
   company keeps its page. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const client=function(){return typeof emsClientOnly==='function'&&emsClientOnly();};
  const building=function(){return typeof presBuilding!=='undefined'&&presBuilding;};
  const SUBS=['branch','departments','designation'];
  /* The panel tab, after Banking Details. */
  if(typeof CS_GROUPS!=='undefined'&&!CS_GROUPS.some(function(g){return g.tabs.indexOf('company-structure')>=0;})){
    const at=CS_GROUPS.findIndex(function(g){return g.id==='banking';});
    CS_GROUPS.splice(at>=0?at+1:1,0,{id:'structure',label:'Company Structure',tabs:['company-structure']});
  }
  if(typeof csVisibleTabs==='function'){
    const v0=csVisibleTabs;
    csVisibleTabs=function(){const t=v0.apply(this,arguments);return client()?t:t.filter(function(x){return x.id!=='company-structure';});};
  }
  /* The sidebar: no Company Structure item. */
  if(typeof window.getSidebarItems==='function'){
    const g0=window.getSidebarItems;
    window.getSidebarItems=function(){
      const out=g0.apply(this,arguments);if(!client())return out;
      return out.filter(function(g){return g.id!=='company-structure';}).map(function(g){
        return g.children&&g.children.some(function(c){return c.id==='company-structure';})
          ?Object.assign({},g,{children:g.children.filter(function(c){return c.id!=='company-structure';})}):g;
      });
    };
  }
  /* The old page opens the panel tab instead. */
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){
      if(pg!=='company-structure'||!client()||building())return n0.apply(this,arguments);
      n0.call(this,'settings');
      if(typeof openCsSidebar==='function'){openCsSidebar(1);csStructureTab='branch';csSetTab('company-structure');}
    };
  }
  /* Branch list as in the product owner's sample: no Radius column. */
  if(typeof csBranchListHTML==='function'){
    const b0=csBranchListHTML;
    csBranchListHTML=function(){
      const out=b0.apply(this,arguments);if(!client())return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      const th=tmp.querySelectorAll('thead th');
      const col=Array.prototype.findIndex.call(th,function(x){return x.textContent.trim()==='Radius';});
      if(col<0)return out;
      th[col].remove();
      tmp.querySelectorAll('tbody tr').forEach(function(tr){
        if(tr.children.length===1){tr.children[0].setAttribute('colspan','5');return;}
        if(tr.children[col])tr.children[col].remove();
      });
      return tmp.innerHTML;
    };
  }
  /* Departments and Designation as clean as the Branch list: Sr. No · Name · Code · Employees · Status · Action (the
     edit pencil). The status moves to the edit form (Active / Inactive), with the same rule as before: one in use by a
     benefit policy cannot be made inactive. */
  if(typeof csStructTabHTML==='function'){
    const t0=csStructTabHTML;
    csStructTabHTML=function(){
      const out=t0.apply(this,arguments);if(!client())return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      const th=tmp.querySelectorAll('thead th');
      const col=Array.prototype.findIndex.call(th,function(x){return x.textContent.trim()==='Benefit Policies';});
      if(col>=0){th[col].remove();tmp.querySelectorAll('tbody tr').forEach(function(tr){if(tr.children.length>col+1&&tr.children[col])tr.children[col].remove();});}
      tmp.querySelectorAll('.csag-act .btn-outline').forEach(function(b){b.remove();});
      return tmp.innerHTML;
    };
  }
  if(typeof csStructFormHTML==='function'){
    const f0=csStructFormHTML;
    csStructFormHTML=function(){
      const out=f0.apply(this,arguments),f=csStructForm;if(!client()||!f||f.id==null)return out;
      const rec=csStructList(f.kind).find(function(x){return x.id===f.id;});if(!rec)return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      const grid=tmp.querySelector('.ep-form-grid');if(!grid)return out;
      const g=document.createElement('div');g.className='ep-form-group';
      g.innerHTML='<label class="ep-form-label">Status <span class="req">*</span></label>'+apCS('css-status',['Active','Inactive'],rec.status||'Active','Select');
      grid.appendChild(g);
      return tmp.innerHTML;
    };
  }
  if(typeof csStructSave==='function'){
    const s0=csStructSave;
    csStructSave=function(){
      const f=csStructForm;
      if(!client()||!f||f.id==null||!document.getElementById('csw-css-status'))return s0.apply(this,arguments);
      const kind=f.kind,id=f.id,want=getCSValue('css-status');
      const out=s0.apply(this,arguments);
      if(!csStructForm){   // saved
        const rec=csStructList(kind).find(function(x){return x.id===id;});
        if(rec&&(want==='Active'||want==='Inactive')&&rec.status!==want)csStructToggle(kind,id);
      }
      return out;
    };
  }
  /* The tab: three sub-tabs; departments and designations A–Z. */
  if(typeof renderCsSidebar==='function'){
    const r0=renderCsSidebar;
    renderCsSidebar=function(){
      const on=client()&&typeof csTab!=='undefined'&&csTab==='company-structure';
      if(on&&SUBS.indexOf(csStructureTab)<0)csStructureTab='branch';
      const out=r0.apply(this,arguments);
      if(!on||csTab!=='company-structure')return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      tmp.querySelectorAll('.cs-subtabs.is-nested .cs-subtab').forEach(function(b){
        const m=/csSetStructureTab\('([^']+)'\)/.exec(b.getAttribute('onclick')||'');
        if(m&&SUBS.indexOf(m[1])<0)b.remove();
      });
      if(csStructureTab==='departments'||csStructureTab==='designation'){
        const body=tmp.querySelector('.csag-table tbody');
        if(body){
          const rows=Array.prototype.slice.call(body.children).filter(function(tr){return tr.querySelector('.csag-num');});
          const name=function(tr){const c=tr.children[1];return c?c.textContent.trim():'';};
          rows.sort(function(a,b){return name(a).localeCompare(name(b));});
          rows.forEach(function(tr,i){body.appendChild(tr);tr.querySelector('.csag-num').textContent=String(i+1);});
        }
      }
      return tmp.innerHTML;
    };
  }
})();
