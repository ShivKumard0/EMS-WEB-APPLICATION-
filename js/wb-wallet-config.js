/* ══ WALLET CONFIG: A WALLET'S BRANCHES AND THEIR DEPARTMENTS (product owner, 15 Nov 2026) ═════════════════════════
   "i want to just on or off the wallet [on the card], i dont want to configure it here for branches and departments,
   instead i want to do it in the wallets and benefits, and i want to add a card after basic details named wallet
   config. in that i can select that this particular wallet type can be configured from what branch and what
   departments of that branch."
   Wallet & Benefits → a wallet's ☰ → Wallet Config (right after Basic Details): one box per branch with a switch,
   and under a switched-on branch its departments to tick. Everything is on to start.
   Decision (product owner, 15 Nov 2026): saved and shown only - it is kept with the wallet (w.cfg) and written to
   its Logs; who has a wallet stays with the wallet's Employees tab and each employee's Card Benefit.
   The ticks set on the card page before this (card product r.reach) are carried over once.
   Super Admin and Company Admin edit; others read. In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof wbTabsFor!=='function'||typeof WB_PANEL==='undefined'||typeof WB_PANEL.w!=='function')return;
  const E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const can=function(){return typeof waCanAdd==='function'?waCanAdd():(typeof emsRole==='function'&&['Super Admin','Company Admin'].indexOf(emsRole())>=0);};
  const nameOf=function(t){return typeof wbTypeName==='function'?wbTypeName(t):t;};
  const branches=function(){return typeof emsBranchNames==='function'?emsBranchNames(idEntity()):[];};
  const depts=function(){return typeof wbDepts==='function'?wbDepts():[];};
  const walletRec=function(type){return typeof wbMine==='function'&&typeof wbWallets!=='undefined'?wbMine(wbWallets).find(function(x){return x.type===type;})||null:null;};
  let draft=null;   // {type, cfg} while editing

  /* The wallet's configuration: branch → its ticked departments; a branch not in it is off. Not set yet = all. */
  function cfgOf(w){
    const B=branches(),D=depts(),out={};
    let src=w.cfg;
    if(!src){   // once: what was ticked on the card page
      try{const p=typeof ccpBook!=='undefined'?ccpBook[idEntity()]:null,x=p&&p.reach&&p.reach[w.type];
        if(x&&Array.isArray(x.b)&&Array.isArray(x.d)){src={};x.b.forEach(function(b){src[b]=x.d.slice();});}}catch(e){}
    }
    B.forEach(function(b){
      if(!src)out[b]=D.slice();
      else if(Array.isArray(src[b]))out[b]=D.filter(function(d){return src[b].indexOf(d)>=0;});
    });
    return out;
  }
  const text=function(cfg){
    const B=branches(),D=depts(),on=B.filter(function(b){return cfg[b];});
    if(!on.length)return 'no branch';
    return on.map(function(b){return b+' ('+(cfg[b].length===D.length?'all departments':cfg[b].join(', '))+')';}).join('; ');
  };

  (function(){
    if(document.getElementById('wcf-style'))return;
    const st=document.createElement('style');st.id='wcf-style';
    st.textContent='.wcf-b{border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:14px 16px;margin-bottom:10px;background:#fff}'
      +'.wcf-b.is-off{background:#fafafa}'
      +'.wcf-bh{display:flex;align-items:center;justify-content:space-between;gap:12px}'
      +'.wcf-bn{font-size:14px;font-weight:600;color:var(--navy,#0f172a);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'.wcf-bs{font-size:12px;color:var(--gray,#6a7282);margin-top:2px}'
      +'.wcf .cs-toggle input:checked+.cs-toggle-slider{background:#1a1a1a}'
      +'.wcf-dh{display:flex;align-items:center;justify-content:space-between;font-size:11.5px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;color:var(--gray,#6a7282);margin:14px 0 0}'
      +'.wcf-dh a{font-size:12px;font-weight:500;letter-spacing:0;text-transform:none;cursor:pointer}'
      +'.wcf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}'
      +'.wcf-opt{display:flex;align-items:center;gap:8px;border:1px solid var(--border,#e5e7eb);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--navy,#0f172a);cursor:pointer;min-width:0;background:#fff;font-weight:400}'
      +'.wcf-opt input{accent-color:#1a1a1a;width:15px;height:15px;margin:0;flex:none}.wcf-opt span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'.wcf-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}'
      +'.wcf-chip{font-size:12px;line-height:1.4;padding:3px 10px;border-radius:999px;background:#f1f3f5;color:var(--navy,#0f172a);white-space:nowrap}';
    (document.head||document.documentElement).appendChild(st);
  })();

  function tabHTML(w){
    const B=branches(),D=depts(),c=can(),editing=!!(draft&&draft.type===w.type),cfg=editing?draft.cfg:cfgOf(w);
    const on=B.filter(function(b){return cfg[b];}).length;
    let h='<div class="wcf"><div class="lp-sb-view-header"><span class="lp-sb-section-title">Wallet Config · '+E(nameOf(w.type))+'</span>'
      +(c&&!editing?'<button class="lp-sb-view-edit-btn" onclick="wcfEdit(\''+w.type+'\')">'+(typeof SB_PEN!=='undefined'?SB_PEN+' ':'')+'Edit</button>':'<span class="wb-muted">'+on+' of '+B.length+' branches</span>')+'</div>';
    if(!B.length)return h+'<div class="wb-empty-sm">No branch is set up in Company Settings yet.</div></div>';
    h+=B.map(function(b,i){
      const sel=cfg[b],isOn=!!sel,n=isOn?sel.length:0;
      let x='<div class="wcf-b'+(isOn?'':' is-off')+'"><div class="wcf-bh"><div style="min-width:0"><div class="wcf-bn" title="'+E(b)+'">'+E(b)+'</div>'
        +'<div class="wcf-bs">'+(isOn?(n===D.length?'All departments':n+' of '+D.length+' departments'):'Not available in this branch')+'</div></div>'
        +(editing?'<label class="cs-toggle" title="'+(isOn?'Switch off ':'Switch on ')+E(b)+'"><input type="checkbox" aria-label="'+E(b)+'"'+(isOn?' checked':'')+' onchange="wcfBranch('+i+',this.checked)"><span class="cs-toggle-slider"></span></label>'
          :(typeof axBadge==='function'?axBadge(isOn?'ok':'idle',isOn?'Active':'Inactive'):''))+'</div>';
      if(isOn&&editing)x+='<div class="wcf-dh"><span>Departments · '+n+' of '+D.length+'</span><a class="att-link" onclick="wcfAll('+i+','+(n===D.length?'false':'true')+')">'+(n===D.length?'Clear all':'Select all')+'</a></div>'
        +'<div class="wcf-grid">'+D.map(function(d,j){return '<label class="wcf-opt"><input type="checkbox"'+(sel.indexOf(d)>=0?' checked':'')+' onchange="wcfDept('+i+','+j+',this.checked)"><span title="'+E(d)+'">'+E(d)+'</span></label>';}).join('')+'</div>';
      else if(isOn&&n<D.length)x+='<div class="wcf-chips">'+sel.map(function(d){return '<span class="wcf-chip">'+E(d)+'</span>';}).join('')+'</div>';
      return x+'</div>';
    }).join('');
    if(editing)h+='<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="wcfCancel()">Cancel</button><button class="ep-save-btn" onclick="wcfSave()">Save changes</button></div>';
    return h+'</div>';
  }

  /* The tab, right after Basic Details. */
  const t0=wbTabsFor;
  wbTabsFor=function(kind){
    const t=t0.apply(this,arguments);if(kind!=='w'||t.some(function(x){return x.id==='wallet-config';}))return t;
    const at=t.findIndex(function(x){return x.id==='basic-details';});
    return t.slice(0,at+1).concat([{id:'wallet-config',label:'Wallet Config'}],t.slice(at+1));
  };
  const pw=WB_PANEL.w;
  WB_PANEL.w=function(r,tab){
    if(tab==='wallet-config')return tabHTML(r);
    if(draft)draft=null;   // left the tab: an unsaved change is dropped
    return pw.apply(this,arguments);
  };

  window.wcfEdit=function(type){const w=walletRec(type);if(!w||!can())return;draft={type:type,cfg:JSON.parse(JSON.stringify(cfgOf(w)))};renderADTPage();};
  window.wcfCancel=function(){draft=null;renderADTPage();};
  window.wcfBranch=function(i,on){if(!draft)return;const b=branches()[i];if(b==null)return;if(on)draft.cfg[b]=depts().slice();else delete draft.cfg[b];renderADTPage();};
  window.wcfAll=function(i,on){if(!draft)return;const b=branches()[i];if(b==null||!draft.cfg[b])return;draft.cfg[b]=on?depts().slice():[];renderADTPage();};
  window.wcfDept=function(i,j,on){
    if(!draft)return;const b=branches()[i],D=depts(),d=D[j];if(b==null||d==null||!draft.cfg[b])return;
    const list=draft.cfg[b].filter(function(x){return x!==d;});if(on)list.push(d);
    draft.cfg[b]=D.filter(function(x){return list.indexOf(x)>=0;});
    renderADTPage();
  };
  window.wcfSave=function(){
    if(!draft||!can())return;
    const w=walletRec(draft.type);if(!w){draft=null;renderADTPage();return;}
    const B=branches(),cfg=draft.cfg,on=B.filter(function(b){return cfg[b];});
    if(!on.length){showToast('Pick a branch','error','Switch on at least one branch for '+nameOf(w.type)+'.');return;}
    const empty=on.find(function(b){return !cfg[b].length;});
    if(empty){showToast('Pick departments','error','Tick at least one department for '+empty+', or switch the branch off.');return;}
    const was=text(cfgOf(w)),now=text(cfg);
    if(was===now&&w.cfg){draft=null;renderADTPage();showToast('No changes','info');return;}
    w.cfg=JSON.parse(JSON.stringify(cfg));
    if(was!==now&&typeof waWalletLog==='function')waWalletLog(w.type,'Wallet Config updated: '+now+'.');
    draft=null;if(typeof presSaveSoon==='function')presSaveSoon();renderADTPage();
    showToast('Wallet Config saved','success',nameOf(w.type)+' · '+now+'.');
  };
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){if(pg!=='wallet-benefits')draft=null;return n0.apply(this,arguments);};
  }
})();
