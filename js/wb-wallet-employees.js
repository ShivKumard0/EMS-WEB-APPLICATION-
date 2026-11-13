/* ══ WALLET & BENEFITS: UNDER CORPORATE CARDS, AND EACH WALLET'S EMPLOYEES (product owner, 13 Nov 2026) ═══════════
   "from side bar in all the profiles remove Wallet & Benefits from Expense Management and move it to Corporate Cards
   under Cards … in each wallet in the action button after Basic Details show Employees, with an Add Employee button and
   the list of employees: S. No, Name, Employee ID, Department, Limit, an On/Off toggle to activate or inactivate that
   wallet benefit for that individual - for every wallet (Health, Reimbursement, Telecom and the rest)."
   Decisions (product owner, 13 Nov 2026):
   - One record: the list reads and changes the employee's Card Benefit (js/emp-card-benefit.js, ecbBook).
   - On/Off decides the wallet: it replaces the Branch/Department entries for every employee whose Card Benefit is
     set - Off = that wallet is not on the employee's card and gets no benefit loads. Employees not set up yet (not
     Active, or never configured) keep their wallets as before. The Limit is shown and recorded; amounts still come
     from Benefit Policies.
   Super Admin and Company Admin add employees, switch them on or off and change limits; others see the list. Each
   change goes to the wallet's Logs and the employee's Logs. In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const money=function(n){return typeof wbMoney==='function'?wbMoney(n):(Number(n)||0).toLocaleString('en-IN')+' INR';};
  const nameOf=function(t){return typeof wbTypeName==='function'?wbTypeName(t):t;};
  const can=function(){return typeof waCanAdd==='function'?waCanAdd():(typeof emsRole==='function'&&['Super Admin','Company Admin'].indexOf(emsRole())>=0);};
  const people=function(){return typeof wbEmployees==='function'?wbEmployees():[];};
  const empLabel=function(e){return typeof waEmpLabel==='function'?waEmpLabel(e):e.name+' · '+(e.empId||'');};
  const wLog=function(type,text){if(typeof waWalletLog==='function')waWalletLog(type,text);};
  let form=null;   // {wallet, eids:[], limit:''} - Add Employee, open in a wallet's Employees tab

  /* ── 1 · The menu: Wallet & Benefits under Corporate Cards, right after Cards, for every role that sees it ── */
  if(typeof sidebarItems!=='undefined'){
    const cc=sidebarItems.find(function(g){return g&&g.dropdown==='Corporate Cards';});
    if(cc&&!cc.children.some(function(c){return c.id==='wallet-benefits';})){
      let item=null;
      sidebarItems.forEach(function(g){
        if(!g||!g.children||g===cc)return;
        const i=g.children.findIndex(function(c){return c.id==='wallet-benefits';});
        if(i>=0)item=g.children.splice(i,1)[0];
      });
      if(item){const at=cc.children.findIndex(function(c){return c.id==='card-list';});cc.children.splice(at<0?0:at+1,0,item);}
    }
  }

  /* ── 2 · The rule: a set-up employee's Card Benefit decides each wallet; everyone else as before ── */
  if(typeof waHasAccess==='function'){
    const h0=waHasAccess;
    waHasAccess=function(emp,wallet){
      const eid=emp&&emp.eid;
      if(eid&&typeof ecbConfigured==='function'&&ecbConfigured(eid)){const e=ecbEntry(eid,wallet);return !!(e&&e.on);}
      return h0.apply(this,arguments);
    };
  }

  /* ── 3 · The wallet's tabs: Basic Details · Employees · Logs · History. Employees right after Basic Details; no
     Funding and no Balances tab (product owner, 13 Nov 2026: "remove Funding and Balances from the action button"). ── */
  const GONE=['funding','balances'];
  if(typeof wbRenderPanel==='function'){
    const rp0=wbRenderPanel;
    wbRenderPanel=function(kind){
      if(kind==='w'&&typeof wbPTab!=='undefined'&&GONE.indexOf(wbPTab.w)>=0)wbPTab.w='basic-details';   // a panel left on a removed tab
      return rp0.apply(this,arguments);
    };
  }
  if(typeof wbTabsFor==='function'){
    const t0=wbTabsFor;
    wbTabsFor=function(kind){
      const t=t0.apply(this,arguments).filter(function(x){return kind!=='w'||GONE.indexOf(x.id)<0;});if(kind!=='w')return t;
      const emp=t.find(function(x){return x.id==='employees';})||{id:'employees',label:'Employees'};
      const rest=t.filter(function(x){return x.id!=='employees';}),at=rest.findIndex(function(x){return x.id==='basic-details';});
      return rest.slice(0,at+1).concat([emp],rest.slice(at+1));
    };
  }

  (function(){
    if(document.getElementById('wwe-style'))return;
    const st=document.createElement('style');st.id='wwe-style';
    st.textContent='.wwe .cs-toggle input:checked+.cs-toggle-slider{background:#1a1a1a}'
      +'.wwe-limit.ep-form-input{width:104px;height:32px;margin:0;padding:0 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;font-size:13px;'
        +'box-shadow:none;-moz-appearance:textfield;appearance:textfield;transition:border-color .15s,box-shadow .15s}'
      +'.wwe-limit.ep-form-input::-webkit-outer-spin-button,.wwe-limit.ep-form-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}'
      +'.wwe-limit.ep-form-input:hover{border-color:#d1d5db}'
      +'.wwe-limit.ep-form-input:focus{outline:none;border-color:#9ca3af;box-shadow:0 0 0 3px rgba(17,24,39,.06)}'
      +'.wwe-off td.csag-td:not(.wwe-st){color:#9ca3af}'
      +'.wwe td.wwe-st{width:64px}';
    (document.head||document.documentElement).appendChild(st);
  })();

  /* ── 4 · The Employees tab: Add Employee, then everyone listed for this wallet ── */
  const members=function(type){
    return people().map(function(e){const x=typeof ecbEntry==='function'?ecbEntry(e.eid,type):null;return x?{e:e,x:x}:null;}).filter(Boolean)
      .sort(function(a,b){return a.e.name.localeCompare(b.e.name);});
  };
  /* Who can be added: Active employees not listed yet (Card Benefit is set once an employee is Active). */
  const pool=function(type){
    const listed=members(type).map(function(m){return m.e.eid;});
    return people().filter(function(e){const r=typeof idEmp==='function'?idEmp(e.eid):null;return (r?r.status:e.status)==='Active'&&listed.indexOf(e.eid)<0;})
      .sort(function(a,b){return a.name.localeCompare(b.name);});
  };
  function formHTML(type){
    const p=pool(type),f=form;
    const all=p.length?' <a class="att-link" style="margin-left:6px;font-weight:500;cursor:pointer" onclick="wweSelectAll()">Select all</a>':'';
    return '<div class="ep-form-group ep-form-full"><label class="ep-form-label">Employees <span class="req">*</span>'+all+'</label>'
        +(typeof apMS==='function'?apMS('wa-f-eids',p.map(empLabel),p.filter(function(e){return f.eids.indexOf(e.eid)>=0;}).map(empLabel),'Search and select employees','wweHook'):'')
        +'<div class="ea-hint">'+(p.length?f.eids.length+' of '+p.length+' selected':'Every Active employee is already listed.')+'</div></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Limit <span class="req">*</span></label>'
        +'<div class="ax-currency"><span>INR</span><input class="ep-form-input" id="wwe-f-limit" type="number" min="1" step="1" inputmode="numeric" placeholder="0" value="'+E(f.limit)+'"></div></div>';
  }
  function tabHTML(w){
    const type=w.type,list=members(type),c=can(),open=!!(form&&form.wallet===type),on=list.filter(function(m){return m.x.on;}).length;
    let h='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Employees · '+E(nameOf(type))+'</span><span class="ax-count">'+list.length+'</span>'
      +(c&&!open?'<button class="lp-sb-view-edit-btn" onclick="wweStart(\''+type+'\')">'+(typeof AX_ICO!=='undefined'?AX_ICO.plus:'+')+' Add Employee</button>':'')+'</div>';
    if(open&&typeof axInlineFormHTML==='function')h+=axInlineFormHTML('<div class="ep-form-grid" id="wwe-f-grid" style="grid-column:1/-1">'+formHTML(type)+'</div>','wweCancel()','wweSubmit()').replace('>Save changes<','>Add Employee<');
    if(!list.length)return h+'<div class="wb-empty-sm">No employee is listed for this wallet yet.</div>';
    h+='<div class="wb-muted" style="margin:-4px 0 10px">'+on+' on · '+(list.length-on)+' off</div>'
      +'<div class="att-table-wrap csag-table-wrap wwe"><table class="att-table csag-table"><thead><tr><th>S. No</th><th>Name</th><th>Employee ID</th><th>Department</th><th>Limit</th><th>Status</th></tr></thead><tbody>'
      +list.map(function(m,i){
        const e=m.e,x=m.x;
        return '<tr class="'+(x.on?'':'wwe-off')+'" id="wwe-row-'+E(e.eid)+'"><td class="csag-td">'+(i+1)+'</td><td class="csag-td">'+E(e.name)+'</td><td class="csag-td">'+E(e.empId||'')+'</td><td class="csag-td">'+E(e.dept||'—')+'</td>'
          +'<td class="csag-td">'+(c?'<input class="ep-form-input wwe-limit" type="number" min="1" step="1" inputmode="numeric" aria-label="Limit for '+E(e.name)+'" value="'+(x.limit||'')+'" placeholder="Limit" onchange="wweLimit(\''+E(e.eid)+'\',\''+type+'\',this)">':E(money(x.limit)))+'</td>'
          +'<td class="csag-td wwe-st"><label class="cs-toggle" title="'+(c?(x.on?'Turn off':'Turn on')+' '+E(nameOf(type))+' for '+E(e.name):(x.on?'On':'Off'))+'"'+(c?'':' style="cursor:default"')+'><input type="checkbox" aria-label="'+E(nameOf(type))+' for '+E(e.name)+'"'+(x.on?' checked':'')+(c?'':' disabled')
            +' onchange="wweToggle(\''+E(e.eid)+'\',\''+type+'\',this)"><span class="cs-toggle-slider"></span></label></td></tr>';
      }).join('')+'</tbody></table></div>';
    return h;
  }
  window.wweTabHTML=tabHTML;
  if(typeof WB_PANEL!=='undefined'&&typeof WB_PANEL.w==='function'){
    const pw=WB_PANEL.w;
    WB_PANEL.w=function(r,tab){if(tab==='employees')return tabHTML(r);return pw.apply(this,arguments);};
  }

  /* ── 5 · Actions ── */
  const walletRec=function(type){return typeof wbMine==='function'&&typeof wbWallets!=='undefined'?wbMine(wbWallets).find(function(x){return x.type===type;})||null:null;};
  const sync=function(){
    if(!form)return;
    const p=pool(form.wallet);
    if(document.getElementById('msw-wa-f-eids')&&typeof getMSValue==='function'){const picked=getMSValue('wa-f-eids');form.eids=p.filter(function(e){return picked.indexOf(empLabel(e))>=0;}).map(function(e){return e.eid;});}
    const l=document.getElementById('wwe-f-limit');if(l)form.limit=l.value.trim();
  };
  const repaintForm=function(){
    const w=form?walletRec(form.wallet):null;
    if(w&&typeof formRepaintParts==='function'&&formRepaintParts(tabHTML(w),['wwe-f-grid']))return;
    renderADTPage();
  };
  window.wweStart=function(type){if(!can())return;form={wallet:type,eids:[],limit:''};renderADTPage();};
  window.wweCancel=function(){form=null;renderADTPage();};
  window.wweHook=function(){sync();repaintForm();};
  window.wweSelectAll=function(){sync();if(!form)return;form.eids=pool(form.wallet).map(function(e){return e.eid;});repaintForm();};
  window.wweSubmit=function(){
    sync();const f=form;if(!f||!can())return;
    if(!f.eids.length){showToast('Select employees','error','Pick at least one employee.');return;}
    const lim=Number(f.limit);
    if(!(lim>0)){showToast('Limit is required','error','Enter a limit greater than 0.');return;}
    const nm=nameOf(f.wallet),names=[];
    f.eids.forEach(function(eid){
      ecbSetWallet(eid,f.wallet,{limit:lim,on:true},'Wallet added in Wallet & Benefits: '+nm+' (limit '+money(lim)+').','Active');
      names.push(typeof idEmpName==='function'?idEmpName(eid):eid);
    });
    wLog(f.wallet,'Employees added: '+names.join(', ')+' · limit '+money(lim)+'.');
    form=null;if(typeof emsClearCache==='function')emsClearCache();renderADTPage();
    showToast('Employees added','success',nm+' · '+names.length+' employee'+(names.length===1?'':'s')+' added, limit '+money(lim)+'.');
  };
  window.wweToggle=function(eid,type,box){
    const nm=nameOf(type),who=typeof idEmpName==='function'?idEmpName(eid):eid;
    if(!can()){if(box)box.checked=!box.checked;return;}
    const x=ecbEntry(eid,type),on=!!(box&&box.checked);
    if(on&&!(x&&x.limit>0)){if(box)box.checked=false;showToast('Set the limit first','error','Enter '+who+'\'s limit for '+nm+', then switch it on.');return;}
    ecbSetWallet(eid,type,{on:on},nm+' switched '+(on?'on':'off')+' in Wallet & Benefits.','Active');
    wLog(type,who+': switched '+(on?'on':'off')+'.');
    if(typeof emsClearCache==='function')emsClearCache();
    const row=document.getElementById('wwe-row-'+eid);if(row)row.classList.toggle('wwe-off',!on);
    const cnt=document.querySelector('.wwe');if(cnt){const head=cnt.previousElementSibling;const l=members(type),k=l.filter(function(m){return m.x.on;}).length;if(head&&head.classList.contains('wb-muted'))head.textContent=k+' on · '+(l.length-k)+' off';}
    showToast(on?'Wallet on':'Wallet off','success',who+' · '+nm+(on?' is on their card.':' is no longer on their card.'));
  };
  window.wweLimit=function(eid,type,inp){
    const nm=nameOf(type),who=typeof idEmpName==='function'?idEmpName(eid):eid,x=ecbEntry(eid,type),v=Number(inp&&inp.value);
    if(!can()){if(inp&&x)inp.value=x.limit||'';return;}
    if(!(v>0)){showToast('Limit is required','error','Enter a limit greater than 0.');if(inp&&x)inp.value=x.limit||'';return;}
    if(x&&x.limit===v)return;
    const before=x?x.limit:0;
    ecbSetWallet(eid,type,{limit:v},nm+' limit changed in Wallet & Benefits: '+money(before)+' → '+money(v)+'.','Active');
    wLog(type,who+': limit '+money(before)+' → '+money(v)+'.');
    showToast('Limit updated','success',who+' · '+nm+' · '+money(v)+'.');
  };
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){if(pg!=='wallet-benefits')form=null;return n0.apply(this,arguments);};
  }
})();
