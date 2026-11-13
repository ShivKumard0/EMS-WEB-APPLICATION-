/* ══ EMPLOYEES → ☰ → CARD BENEFIT (product owner, 13 Nov 2026) ════════════════════════════════════════════════
   A tab on the employee's panel, after the others. Wallets is one toggle; while it is on, every benefit is listed
   below it with its own toggle and, to the right of the toggle, a Limit. Save changes → the screen shows the enabled
   wallets and their limits, with Edit to change them (Cancel / Save changes).
   Set once the employee is Active: Add Employee and Bulk Upload Employees are unchanged, and an employee who is not
   Active yet reads "set once … is Active". Editing follows Basic Details' Edit (epCanAdmin: may manage employees, in
   the employee's own company). Each save goes to the employee's Logs tab. Display only: nothing is linked to
   Corporate Cards or Wallet & Benefits. */

/* eid → {on, wallets:{CODE:limit}, logs:[]}. Top-level so the presentation keeps it (tools/gen-pres-names.js). */
const ecbBook={};

(function(){
  /* The same ten wallet and benefit names as Company Settings → Card Setup. Only the name is shown (product owner,
     13 Nov 2026: no sub-line such as Flexi Benefit under it); the third value is kept for reference. */
  const WALLETS=[['MEAL','Meal','Flexi Benefit'],['FUEL','Fuel','Flexi Benefit'],['GIFT','Gift','Flexi Benefit'],['TEL','Telecom','Flexi Benefit'],
    ['BOOK','Books & Learning','Benefit'],['WELL','Wellness','Benefit'],['CORP','Corporate Expense','Company Expense'],['REIMB','Reimbursement','Reimbursement'],
    ['PERS','Personal','Personal'],['NCMC','Transit / NCMC','Transit']];
  const TAB='card-benefit';
  const E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const money=function(n){return typeof wbMoney==='function'?wbMoney(n):(Number(n)||0).toLocaleString('en-IN')+' INR';};
  const badge=function(tone,t){return typeof axBadge==='function'?axBadge(tone,t):E(t);};
  const PEN='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  const TICK='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:#16a34a;flex:none" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  /* The look of Card Setup's cards, for this tab (its own copy: those rules load only in the presentation). */
  (function(){
    if(document.getElementById('ecb-style'))return;
    const st=document.createElement('style');st.id='ecb-style';
    st.textContent='.ecb-card{border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:12px 14px;margin-bottom:8px;background:#fff}'
      +'.ecb-row{display:flex;align-items:center;gap:12px}.ecb-txt{flex:1;min-width:0}'
      +'.ecb-name{font-size:13.5px;font-weight:600;color:var(--navy,#0f172a)}'
      +'.ecb-sub{font-size:12px;color:var(--gray,#6a7282);margin-top:2px}'
      +'.ecb-h{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;color:var(--navy,#0f172a);margin:16px 0 8px}'
      +'.ecb-h span+span{font-size:12px;font-weight:500;color:var(--gray,#6a7282)}'
      +'.ecb .cs-toggle input:checked+.cs-toggle-slider{background:#1a1a1a}'
      /* The Limit box: clean, slightly rounded (product owner, 13 Nov 2026) - a light border, white even while its
         benefit is off (only the placeholder is paler then), no up/down arrows, a soft ring while typing. */
      +'.ecb .ecb-limit.ep-form-input{width:112px;height:34px;flex:none;margin:0;padding:0 12px;border:1px solid #e5e7eb;border-radius:8px;'
        +'background:#fff;font-size:13px;color:var(--navy,#0f172a);box-shadow:none;-moz-appearance:textfield;appearance:textfield;transition:border-color .15s,box-shadow .15s}'
      +'.ecb .ecb-limit.ep-form-input::placeholder{color:#9ca3af}'
      +'.ecb .ecb-limit.ep-form-input::-webkit-outer-spin-button,.ecb .ecb-limit.ep-form-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}'
      +'.ecb .ecb-limit.ep-form-input:hover:not(:disabled){border-color:#d1d5db}'
      +'.ecb .ecb-limit.ep-form-input:focus{outline:none;border-color:#9ca3af;box-shadow:0 0 0 3px rgba(17,24,39,.06)}'
      +'.ecb .ecb-limit.ep-form-input:disabled{background:#fff;border-color:#f0f1f3;cursor:not-allowed}'
      +'.ecb .ecb-limit.ep-form-input:disabled::placeholder{color:#c7cbd1}'
      +'.ecb .ecb-limit.ep-form-input.is-err{border-color:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.08)}'
      +'.ecb-amt{font-size:13px;font-weight:600;color:var(--navy,#0f172a);white-space:nowrap}'
      +'.ecb-amt small{display:block;font-size:11px;font-weight:500;color:var(--gray,#6a7282);text-align:right}';
    (document.head||document.documentElement).appendChild(st);
  })();

  let draft=null;     // {key, on, sel:{CODE:true}, lim:{CODE:'text'}} - changes not yet saved
  let editing='';     // the employee whose saved Card Benefit is open for editing
  let showErr=false;  // after a refused save: mark the benefits that need a limit

  const empNow=function(){return typeof directEmpData!=='undefined'&&typeof deSelectedId!=='undefined'&&deSelectedId!=null?directEmpData.find(function(e){return e.id===deSelectedId;})||null:null;};
  const keyOf=function(emp){return emp?(emp.eid||'de-'+emp.id):'';};
  const canEdit=function(emp){return !!emp&&emp.status==='Active'&&(typeof epCanAdmin==='function'?epCanAdmin(emp):(typeof emsCan!=='function'||emsCan('h2r.employee.manage')));};
  const saved=function(k){
    const b=ecbBook[k],out={on:false,sel:{},lim:{}};if(!b)return out;
    out.on=!!b.on;Object.keys(b.wallets||{}).forEach(function(c){out.sel[c]=true;out.lim[c]=String(b.wallets[c]);});return out;
  };
  const hasSaved=function(k){return !!ecbBook[k]&&ecbBook[k].on!==undefined;};
  const cur=function(k){return draft&&draft.key===k?draft:saved(k);};
  const edit=function(k){if(!draft||draft.key!==k){const s=saved(k);draft={key:k,on:s.on,sel:Object.assign({},s.sel),lim:Object.assign({},s.lim)};}return draft;};
  /* Two states are the same when Wallets matches and, while on, the same benefits carry the same limits. */
  const sig=function(x){return x.on?'on|'+WALLETS.filter(function(w){return x.sel[w[0]];}).map(function(w){return w[0]+'='+(Number(x.lim[w[0]])||0);}).join(','):'off';};
  const dirty=function(k){return !!(draft&&draft.key===k&&sig(draft)!==sig(saved(k)));};

  const toggle=function(on,js,name,dis){
    return '<label class="cs-toggle" title="'+E((on?'Turn off ':'Turn on ')+name)+'"'+(dis?' style="cursor:not-allowed"':'')+'><input type="checkbox" aria-label="'+E(name)+'"'+(on?' checked':'')+(dis?' disabled':'')+' onchange="'+js+'"><span class="cs-toggle-slider"></span></label>';
  };
  const head=function(right){
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span class="lp-sb-section-title">Card Benefit</span><span id="ecb-head-right">'+right+'</span></div>';
  };
  const actionsHTML=function(k){
    if(hasSaved(k))return '<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ecbCancel()">Cancel</button><button class="ep-save-btn" onclick="ecbSave()">Save changes</button></div>';
    return dirty(k)?'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ecbDiscard()">Discard</button><button class="ep-save-btn" onclick="ecbSave()">Save changes</button></div>':'';
  };

  function formHTML(emp){
    const k=keyOf(emp),c=cur(k),n=WALLETS.filter(function(w){return c.sel[w[0]];}).length;
    return '<div id="ecb-root" class="ecb">'
      +head(dirty(k)?badge('wait','Unsaved changes'):'')
            +'<div class="ecb-card" style="margin-top:14px"><div class="ecb-row"><div class="ecb-txt"><div class="ecb-name">Wallets</div><div class="ecb-sub">Benefit wallets on '+E(emp.name)+'\'s card</div></div>'
        +toggle(c.on,'ecbWallets(this.checked)','Wallets')+'</div></div>'
      +(c.on?'<div class="ecb-h"><span>Benefits</span><span>'+n+' of '+WALLETS.length+' selected</span></div>'
        +WALLETS.map(function(w){
          const on=!!c.sel[w[0]],v=c.lim[w[0]]||'',bad=showErr&&on&&!(Number(v)>0);
          return '<div class="ecb-card"><div class="ecb-row"><div class="ecb-txt"><div class="ecb-name">'+E(w[1])+'</div></div>'
            +toggle(on,'ecbPick(\''+w[0]+'\',this.checked)',w[1])
            +'<input class="ep-form-input ecb-limit'+(bad?' is-err':'')+'" type="number" min="1" step="1" inputmode="numeric" placeholder="Limit" aria-label="'+E(w[1])+' limit" title="'+(on?'Limit (INR)':'Turn on '+E(w[1])+' to set its limit')+'"'
              +' value="'+E(v)+'"'+(on?'':' disabled')+' oninput="ecbLimit(\''+w[0]+'\',this.value)">'
            +'</div></div>';}).join(''):'')
      +'<div id="ecb-actions">'+actionsHTML(k)+'</div>'
      +'</div>';
  }
  /* Saved: the enabled wallets and their limits, with Edit. */
  function viewHTML(emp){
    const k=keyOf(emp),s=saved(k),ws=WALLETS.filter(function(w){return s.sel[w[0]];});
    return '<div id="ecb-root" class="ecb">'
      +head(canEdit(emp)?'<button class="lp-sb-view-edit-btn" onclick="ecbEditOn()">'+PEN+' Edit</button>':'')
            +'<div class="ecb-card" style="margin-top:14px"><div class="ecb-row"><div class="ecb-txt"><div class="ecb-name">Wallets</div><div class="ecb-sub">Benefit wallets on '+E(emp.name)+'\'s card</div></div>'
        +(s.on?badge('ok','Enabled'):badge('idle','Off'))+'</div></div>'
      +(s.on?'<div class="ecb-h"><span>Enabled wallets</span><span>'+ws.length+' of '+WALLETS.length+'</span></div>'
        +ws.map(function(w){return '<div class="ecb-card"><div class="ecb-row">'+TICK+'<div class="ecb-txt"><div class="ecb-name">'+E(w[1])+'</div></div>'
          +'<div class="ecb-amt"><small>Limit</small>'+E(money(s.lim[w[0]]))+'</div></div></div>';}).join(''):'')
      +'</div>';
  }
  function tabHTML(emp){
    const k=keyOf(emp);
    if(hasSaved(k)&&editing!==k)return viewHTML(emp);
    if(canEdit(emp))return formHTML(emp);
    const why=emp.status!=='Active'?'Card Benefit is set once '+E(emp.name)+' is Active.':'No card benefits set for '+E(emp.name)+'.';
    return '<div id="ecb-root" class="ecb">'+head('')+'<div class="wb-empty-sm" style="margin-top:12px">'+why+'</div></div>';
  }
  window.ecbTabHTML=tabHTML;

  const paint=function(){const emp=empNow(),el=document.getElementById('ecb-root');if(emp&&el)el.outerHTML=tabHTML(emp);};
  /* Typing a limit keeps the focus: only the badge and the buttons are redrawn. */
  const sync=function(){
    const emp=empNow();if(!emp)return;const k=keyOf(emp);
    const h=document.getElementById('ecb-head-right'),a=document.getElementById('ecb-actions');
    if(h)h.innerHTML=dirty(k)?badge('wait','Unsaved changes'):'';
    if(a)a.innerHTML=actionsHTML(k);
  };
  window.ecbWallets=function(on){const emp=empNow();if(!canEdit(emp))return;edit(keyOf(emp)).on=!!on;paint();};
  window.ecbPick=function(c,on){const emp=empNow();if(!canEdit(emp))return;const d=edit(keyOf(emp));if(on)d.sel[c]=true;else delete d.sel[c];paint();};
  window.ecbLimit=function(c,v){
    const emp=empNow();if(!canEdit(emp))return;edit(keyOf(emp)).lim[c]=String(v==null?'':v).trim();
    if(showErr){const inp=document.querySelector('#ecb-root .ecb-limit[aria-label="'+(WALLETS.find(function(w){return w[0]===c;})||[0,''])[1].replace(/"/g,'')+' limit"]');if(inp)inp.classList.toggle('is-err',!(Number(v)>0));}
    sync();
  };
  window.ecbDiscard=function(){draft=null;showErr=false;paint();};
  window.ecbCancel=function(){draft=null;editing='';showErr=false;paint();};
  window.ecbEditOn=function(){const emp=empNow();if(!canEdit(emp))return;editing=keyOf(emp);draft=null;showErr=false;paint();};
  window.ecbSave=function(){
    const emp=empNow();if(!canEdit(emp))return;
    const k=keyOf(emp);
    if(!dirty(k)){draft=null;editing='';showErr=false;paint();return;}
    const d=draft,on=WALLETS.filter(function(w){return d.sel[w[0]];});
    if(d.on&&!on.length){showToast('Turn on a benefit','error','Turn on at least one benefit, or turn Wallets off.');return;}
    const bad=d.on?on.filter(function(w){return !(Number(d.lim[w[0]])>0);}):[];
    if(bad.length){showErr=true;paint();showToast('Set the limits','error','Enter a limit greater than 0 for '+bad.map(function(w){return w[1];}).join(', ')+'.');return;}
    const wallets={};if(d.on)on.forEach(function(w){wallets[w[0]]=Math.round(Number(d.lim[w[0]])*100)/100;});
    const b=ecbBook[k]||(ecbBook[k]={logs:[]});b.on=!!d.on;b.wallets=wallets;b.logs=b.logs||[];
    const text=d.on?'Wallets enabled: '+on.map(function(w){return w[1]+' (limit '+money(wallets[w[0]])+')';}).join(', ')+'.':'Wallets off.';
    const s=typeof stampNow==='function'?stampNow():{date:new Date().toLocaleDateString(),time:''};
    b.logs.unshift({date:s.date,time:s.time,user:typeof wbActor==='function'?wbActor():(typeof CURRENT_USER!=='undefined'?CURRENT_USER:''),userId:typeof idMe==='function'?idMe():'',status:emp.status,action:text});
    draft=null;editing='';showErr=false;paint();
    showToast('Card Benefit saved','success',emp.name+' · '+text);
    if(typeof presSaveSoon==='function')presSaveSoon();
  };

  /* The tab, after the panel's other tabs. */
  if(typeof deExtraTabs==='function'){
    const x0=deExtraTabs;
    /* Not on another employee's record when the viewer may only see their own (as the KYC tab). */
    deExtraTabs=function(emp){
      /* The Benefits tab is removed from every employee's panel (product owner, 13 Nov 2026); Card Benefit stays. */
      const t=x0.apply(this,arguments).filter(function(x){return x.id!=='benefits';});
      if(typeof oncSelfOnly==='function'&&oncSelfOnly()&&!(typeof oncIsSelf==='function'&&oncIsSelf(emp)))return t;
      return t.concat([{id:TAB,label:'Card Benefit'}]);
    };
  }
  if(typeof renderDeSidebar==='function'){
    const r0=renderDeSidebar;
    renderDeSidebar=function(){
      if(typeof deTab!=='undefined'&&deTab==='benefits')deTab='basic-details';   // a panel left on the removed Benefits tab
      const out=r0.apply(this,arguments);
      if(!out||out.indexOf('navDeTab(\''+TAB+'\')')<0)return out;   // the tab is not offered
      const emp=empNow();if(!emp)return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      /* Order (product owner, 13 Nov 2026): Basic Details · KYC · Card Benefit · then the rest as they were. At the
         end of the row Card Benefit sat past the scroll edge ("unable to see the card benefit"). */
      const bar=tmp.querySelector('#de-isb-tabs'),first=bar&&bar.firstElementChild;
      const tabOf=function(id){return bar?Array.prototype.find.call(bar.children,function(b){return (b.getAttribute('onclick')||'').indexOf('navDeTab(\''+id+'\')')>=0;}):null;};
      let after=first;
      [tabOf('onc-card'),tabOf(TAB)].forEach(function(t){if(!t||!after||t===after)return;bar.insertBefore(t,after.nextElementSibling);after=t;});
      if(typeof deTab!=='undefined'&&deTab===TAB){const body=tmp.querySelector('.lp-isb-body');if(body)body.innerHTML=tabHTML(emp);}
      return tmp.innerHTML;
    };
  }
  /* Its saves in the employee's Logs tab, beside the lifecycle and the card enrollment entries. */
  if(typeof empTimelineHTML==='function'){
    const t0=empTimelineHTML;
    empTimelineHTML=function(emp){
      const b=emp?ecbBook[keyOf(emp)]:null,mine=b&&b.logs&&b.logs.length?b.logs:null;
      if(!mine||typeof empLogs!=='function'||typeof lplTableHTML!=='function')return t0.apply(this,arguments);
      const h=typeof empLifeHtml==='function'?empLifeHtml:E;
      const r=emp.eid&&typeof oncData!=='undefined'?oncData[emp.eid]:null,onc=r&&r.logs?r.logs:[];
      const rows=empLogs(emp).map(function(l){return {status:h(l.status),user:h(l.user),role:l.system?'System':'',date:l.date,time:l.time,action:h(l.action),src:l};})
        .concat(onc.map(function(l){return {status:h(l.status),user:h(l.user),role:'',date:l.date,time:l.time,action:h('Card enrollment · '+l.action),src:null};}))
        .concat(mine.map(function(l){return {status:h(l.status),user:h(l.user),role:'',date:l.date,time:l.time,action:h('Card Benefit · '+l.action),src:null};}));
      return lplTableHTML(typeof emsLogSort==='function'?emsLogSort(rows):rows,{rowExtra:function(x){return x.src&&typeof empLogExtraHTML==='function'?empLogExtraHTML(x.src):'';}});
    };
  }
})();
