/* ══ WALLET ACCESS: SEARCH MEMBERS BY NAME, ID OR EMAIL (product owner, 12 Nov 2026) ═══════════════════════════════
   Wallet & Benefits → a wallet's ☰ → Employees → Add Employees: the Select Members (and Employees) dropdown opens with a
   search box on top. Typing matches the employee's name (any word starting with it - "a" lists Aditya, Ajay, Ananya …),
   Employee ID ("1" lists EMP001, EMP010 …) or email; each option shows the name with its ID, email and department.
   Picking works as before (the list stays open, Select all is unchanged). In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const ID='wa-f-eids';
  let q='';
  const emps=function(){return typeof wbEmployees==='function'?wbEmployees():[];};
  const byLabel=function(){const m={};if(typeof waEmpLabel==='function')emps().forEach(function(e){m[waEmpLabel(e)]=e;});return m;};
  const email=function(e){if(e.email)return String(e.email);const f=typeof idEmp==='function'&&e.eid?idEmp(e.eid):null;return String(f&&f.email||'');};
  /* Rank: name starting with it, a later word of the name, the ID, the email. */
  const rank=function(e,s){
    if(!s)return 1;
    const n=String(e.name||'').toLowerCase();
    if(n.indexOf(s)===0)return 1;
    if(n.split(/\s+/).some(function(w){return w.indexOf(s)===0;}))return 2;
    if(String(e.empId||'').toLowerCase().indexOf(s)>=0)return 3;
    if(email(e).toLowerCase().indexOf(s)===0)return 4;
    return 0;
  };
  if(typeof msOptionsHTML==='function'){
    const o0=msOptionsHTML;
    msOptionsHTML=function(id){
      if(id!==ID)return o0.apply(this,arguments);
      const s=apMSState[id];if(!s)return '';
      const map=byLabel(),qs=q.trim().toLowerCase();
      const list=s.opts.map(function(o,i){const e=map[o];return {o:o,e:e,r:e?rank(e,qs):(o.toLowerCase().indexOf(qs)>=0?5:0),i:i};})
        .filter(function(x){return x.r>0;}).sort(function(a,b){return a.r-b.r||a.i-b.i;});
      const box='<div style="position:sticky;top:0;z-index:1;background:#fff;padding:6px 6px 8px;border-bottom:1px solid var(--border,#e5e7eb)" onclick="event.stopPropagation()">'
        +'<input class="ep-form-input" id="wams-q" type="text" autocomplete="off" placeholder="Search by name, ID or email" value="'+attrSafe(q)+'" oninput="waMsSearch(this.value)" style="height:34px"></div>';
      const rows=list.length?list.map(function(x){
        const on=s.sel.indexOf(x.o)>=0,e=x.e;
        const main=e?e.name:x.o,sub=e?[e.empId,email(e),e.dept].filter(Boolean).join(' · '):'';
        return '<div class="cs-option'+(on?' cs-selected':'')+'" role="option" aria-selected="'+on+'" onclick="msPick(\''+id+'\',\''+attrSafe(x.o).replace(/'/g,'&#39;')+'\')">'
          +'<span style="display:flex;flex-direction:column;min-width:0"><span>'+attrSafe(main)+'</span>'+(sub?'<span style="font-size:11.5px;color:var(--gray,#6a7282)">'+attrSafe(sub)+'</span>':'')+'</span>'
          +'<svg class="cs-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>';
      }).join(''):'<div style="padding:12px;font-size:12.5px;color:var(--gray,#6a7282)">No employee matches "'+attrSafe(q)+'".</div>';
      return box+rows;
    };
  }
  /* Typing redraws the options only; the box keeps its focus and caret. */
  window.waMsSearch=function(v){
    q=v||'';
    const d=document.getElementById('msd-'+ID);if(!d)return;
    const inp=document.getElementById('wams-q'),pos=inp?inp.selectionStart:q.length;
    d.innerHTML=msOptionsHTML(ID);
    const n=document.getElementById('wams-q');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(e){}}
  };
  /* A pick redraws the list: the search box comes back focused. */
  if(typeof msPaint==='function'){
    const p0=msPaint;
    msPaint=function(id){
      const had=id===ID&&document.activeElement&&document.activeElement.id==='wams-q';
      const out=p0.apply(this,arguments);
      if(id===ID){const n=document.getElementById('wams-q');if(n&&had){n.focus();try{n.setSelectionRange(q.length,q.length);}catch(e){}}}
      return out;
    };
  }
  /* Each opening starts with an empty search, with the box ready to type in. */
  if(typeof msToggle==='function'){
    const t0=msToggle;
    msToggle=function(btn){
      if(btn&&btn.dataset&&btn.dataset.msid===ID)q='';
      const out=t0.apply(this,arguments);
      if(btn&&btn.dataset&&btn.dataset.msid===ID){const n=document.getElementById('wams-q');if(n)setTimeout(function(){n.focus();},0);}
      return out;
    };
  }
})();
