/* ══ CORPORATE CARDS → CARDS (THE CARD ITSELF): NOVA X RBL MULTIWALLET CARD (product owner, 13 Nov 2026) ══════════
   "make another Cards option in Corporate Cards under the existing Cards; one line item named NOVA X RBL Multiwallet
   Card with a few details; in the action button the first tab shows the card image and below it the details (named
   Details), the next tab Wallets - the wallet names with On or Off and an Edit button - then Logs, then Workflow."
   Product owner's choices (13 Nov 2026): the menu item is named "Cards" (a second one, right under the existing Cards,
   which lists the cards issued to people); the Wallets switches are DISPLAY ONLY - saved here and logged, but issued
   cards, balances and Wallet & Benefits are not changed. Who sees it: the people who see Corporate Cards' admin view;
   Super Admin and Company Admin change wallets and status. In the presentation, Nova Retail has the one card. */

/* entity → {id, code, name, bank, network, type, form, currency, kyc, validity, fee, launched, status, wallets:{CODE:bool}, logs:[]}.
   Top-level so the presentation keeps it (tools/gen-pres-names.js). */
const ccpBook={};

(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const PG='card-products';
  const E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const ent=function(){return typeof idEntity==='function'?idEntity():'';};
  const rec=function(){return ccpBook[ent()]||null;};
  const badge=function(tone,t){return typeof axBadge==='function'?axBadge(tone,t):E(t);};
  const can=function(){return typeof emsRole==='function'&&['Super Admin','Company Admin'].indexOf(emsRole())>=0;};
  const walletsOf=function(e){
    if(typeof wbWallets==='undefined')return [];
    return wbWallets.filter(function(w){return w.entity===e&&w.status==='Active';})
      .sort(function(a,b){return ((a.type==='CORP')-(b.type==='CORP'))||(a.id-b.id);})
      .map(function(w){return [w.type,typeof wbTypeName==='function'?wbTypeName(w.type):w.type];});
  };
  const issued=function(e){return typeof ccCards!=='undefined'?ccCards.filter(function(c){return c.entity===e&&typeof ccCardUsable==='function'&&ccCardUsable(c);}).length:0;};
  const programme=function(e){
    const ps=typeof ccProgAll==='function'?ccProgAll().filter(function(p){return p.entity===e;}):[];
    return ps.find(function(p){return /multi/i.test(p.name||'')||/MULTI/.test(p.key||'');})||ps[0]||null;
  };
  const onList=function(r){return walletsOf(r.entity).filter(function(w){return r.wallets[w[0]]!==false;});};
  const stamp=function(){const s=typeof stampNow==='function'?stampNow():{date:new Date().toLocaleDateString(),time:''};return s;};
  const actor=function(){return typeof wbActor==='function'?wbActor():(typeof CURRENT_USER!=='undefined'?CURRENT_USER:'');};
  const log=function(r,status,text){const s=stamp();r.logs.unshift({date:s.date,time:s.time,user:actor(),status:status,action:text});if(typeof presSaveSoon==='function')presSaveSoon();};

  /* ── Nova Retail's card, set up once ── */
  function seed(){
    if(typeof PRES_ON==='undefined'||!PRES_ON||typeof presNova!=='function')return;
    if(typeof presBuilding!=='undefined'&&presBuilding)return;
    const n=presNova();if(!n)return;const e=n.entityId||n.id;
    if(ccpBook[e])return;
    const ws={};walletsOf(e).forEach(function(w){ws[w[0]]=true;});
    const names=walletsOf(e).map(function(w){return w[1];}).join(', ');
    ccpBook[e]={id:1001,entity:e,code:'CPR-1001',name:'NOVA X RBL Multiwallet Card',bank:'RBL Bank',network:'RuPay',type:'Prepaid · Multi-wallet',
      form:'Physical and Virtual',currency:'INR',kyc:'Full KYC (Aadhaar and PAN)',validity:'5 years from issue',fee:'Nil',launched:'01 Apr 2026',status:'Active',wallets:ws,
      logs:[
        {date:'05 Apr 2026',time:'11:20:14 AM',user:'Karan Shah',status:'Active',action:'Activated with RBL Bank: cards can be issued to Nova Retail employees.'},
        {date:'02 Apr 2026',time:'03:42:08 PM',user:'Rohan Mehta',status:'Approved',action:'Approved by Finance: fees, load limits and the funding account checked.'},
        {date:'01 Apr 2026',time:'10:05:37 AM',user:'Karan Shah',status:'Draft',action:'Card created: NOVA X RBL Multiwallet Card with RBL Bank (RuPay, prepaid multi-wallet); wallets '+names+' switched on.'}]};
    if(typeof presSaveSoon==='function')presSaveSoon();
  }
  window.addEventListener('load',function(){
    if(typeof PRES_READY!=='undefined'&&PRES_READY&&PRES_READY.then)PRES_READY.then(function(){try{seed();}catch(err){if(typeof console!=='undefined')console.warn('card product',err);}});
  });

  /* ── Look ── */
  (function(){
    if(document.getElementById('nxc-style'))return;
    const st=document.createElement('style');st.id='nxc-style';
    st.textContent='.nxc-card{position:relative;width:100%;max-width:360px;aspect-ratio:1.586;border-radius:18px;padding:20px 22px;color:#fff;overflow:hidden;margin:4px auto 18px;'
        +'background:radial-gradient(120% 140% at 100% 0%,#d71f3a 0%,rgba(215,31,58,0) 46%),linear-gradient(135deg,#0b1d39 0%,#14325e 58%,#1d4677 100%);'
        +'box-shadow:0 14px 30px rgba(11,29,57,.28),inset 0 1px 0 rgba(255,255,255,.12);font-family:inherit}'
      +'.nxc-card:after{content:"";position:absolute;right:-60px;bottom:-80px;width:230px;height:230px;border-radius:50%;border:28px solid rgba(255,255,255,.05)}'
      +'.nxc-top{display:flex;justify-content:space-between;align-items:flex-start}'
      +'.nxc-brand{font-weight:800;font-size:18px;letter-spacing:.06em}.nxc-brand span{font-weight:500;opacity:.8;margin:0 6px}'
      +'.nxc-bank{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.85;margin-top:3px}'
      +'.nxc-type{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.75;text-align:right}'
      +'.nxc-chip{width:44px;height:33px;border-radius:7px;margin-top:22px;background:linear-gradient(135deg,#f6dd8f,#c9a24a 55%,#f1d27a);position:relative;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}'
      +'.nxc-chip:before{content:"";position:absolute;inset:7px 10px;border:1px solid rgba(80,60,10,.35);border-radius:4px}'
      +'.nxc-wave{position:absolute;left:78px;top:83px;width:22px;height:22px;opacity:.8}'
      +'.nxc-num{font-size:17px;letter-spacing:.16em;margin-top:16px;font-weight:600;text-shadow:0 1px 1px rgba(0,0,0,.25)}'
      +'.nxc-foot{position:absolute;left:22px;right:22px;bottom:16px;display:flex;justify-content:space-between;align-items:flex-end}'
      +'.nxc-lab{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;opacity:.65}.nxc-val{font-size:12px;font-weight:600;letter-spacing:.06em;margin-top:2px}'
      +'.nxc-net{font-style:italic;font-weight:800;font-size:19px;letter-spacing:.02em}.nxc-net b{color:#f4a51c}'
      +'.nxc-w{display:flex;align-items:center;gap:12px;border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:12px 14px;margin-bottom:8px;background:#fff}'
      +'.nxc-w-name{flex:1;font-size:13.5px;font-weight:600;color:var(--navy,#0f172a)}'
      +'.nxc .cs-toggle input:checked+.cs-toggle-slider{background:#1a1a1a}'
      +'.nxc .cs-toggle input:disabled+.cs-toggle-slider{opacity:.55;cursor:default}';
    (document.head||document.documentElement).appendChild(st);
  })();
  const WAVE='<svg class="nxc-wave" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M8.5 7.5a6 6 0 0 1 0 9"/><path d="M12 5a9.5 9.5 0 0 1 0 14"/><path d="M15.5 2.5a13 13 0 0 1 0 19"/></svg>';
  function cardImage(r){
    return '<div class="nxc-card" role="img" aria-label="'+E(r.name)+'">'
      +'<div class="nxc-top"><div><div class="nxc-brand">NOVA<span>×</span>RBL</div><div class="nxc-bank">RBL Bank</div></div><div class="nxc-type">Multiwallet<br>Prepaid</div></div>'
      +'<div class="nxc-chip"></div>'+WAVE
      +'<div class="nxc-num">•••• •••• •••• ••••</div>'
      +'<div class="nxc-foot"><div><div class="nxc-lab">Card Holder</div><div class="nxc-val">NOVA RETAIL EMPLOYEE</div></div>'
        +'<div><div class="nxc-lab">Valid Thru</div><div class="nxc-val">MM/YY</div></div><div class="nxc-net">Ru<b>Pay</b></div></div>'
      +'</div>';
  }

  /* ── The listing ── */
  let q='',statusF='',sel=null,tab='details',editing=false,draft=null;
  const fc=function(label,val,wide){return typeof csuFc==='function'?csuFc(typeof CSU_ICO!=='undefined'?CSU_ICO.card:'',label,val,wide):'<div>'+label+': '+val+'</div>';};
  const fcI=function(ico,label,val,wide){return typeof csuFc==='function'?csuFc(typeof CSU_ICO!=='undefined'?CSU_ICO[ico]:'',label,val,wide):'<div>'+label+': '+val+'</div>';};
  function shown(){
    const r=rec();if(!r)return [];
    const s=String(q||'').trim().toLowerCase();
    if(statusF&&r.status!==statusF)return [];
    if(s&&![r.name,r.code,r.bank,r.network].some(function(v){return String(v).toLowerCase().indexOf(s)>=0;}))return [];
    return [r];
  }
  function pageHTML(){
    const rows=shown(),r=rec();
    if(sel!=null&&!rows.some(function(x){return x.id===sel;}))sel=null;
    const dots=function(x){return typeof csuDots==='function'?csuDots('ccpOpen('+x.id+')',x.name):'<td><button class="ct-dots-btn" onclick="ccpOpen('+x.id+')">&#9776;</button></td>';};
    const trs=rows.map(function(x,i){
      return '<tr class="nxc-row'+(sel===x.id?' lp-row-selected':'')+'" id="nxc-row-'+x.id+'" style="cursor:pointer" onclick="ccpOpen('+x.id+')">'
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="lp-c-main ax-c-link">'+E(x.name)+'</div><div class="lp-c-sub">'+E(x.code)+'</div></td>'
        +'<td><div class="lp-c-plain">'+E(x.bank)+'</div><div class="lp-c-sub">'+E(x.network)+'</div></td>'
        /* Card Type and Launched On (product owner, 13 Nov 2026: in place of Wallets and Cards Issued). */
        +'<td><div class="lp-c-plain">'+E(x.type)+'</div><div class="lp-c-sub">'+E(x.form)+'</div></td>'
        +'<td><div class="lp-c-plain">'+E(x.launched)+'</div><div class="lp-c-sub">Valid '+E(String(x.validity||'').replace(/ from issue$/,''))+'</div></td>'
        +'<td>'+badge(x.status==='Active'?'ok':'idle',x.status)+'</td>'
        +dots(x)+'</tr>';
    });
    const body=trs.length?trs.join(''):(typeof ccEmpty==='function'?ccEmpty(7,r?'No card matches this filter.':'No card is set up for this company yet.'):'');
    const act=r&&r.status==='Active'?1:0,ina=r&&r.status!=='Active'?1:0;
    const tiles=typeof caStat==='function'?caStat('Active',act,statusF==='Active','ccpStat(\'Active\')','ok')+caStat('Inactive',ina,statusF==='Inactive','ccpStat(\'Inactive\')','idle'):'';
    const table='<table class="lp-table ax-table cc-table"><thead><tr><th>S. No</th><th>Card</th><th>Bank · Network</th><th>Card Type</th><th>Launched On</th><th>Status</th><th>Action</th></tr></thead><tbody>'+body+'</tbody></table>';
    return '<div class="lp-page">'
      +(typeof ccFilterBar==='function'?ccFilterBar((typeof lpSearchField==='function'?lpSearchField('nxc-q',q,'Search card, code or bank','ccpApply()'):'')
          +(typeof apCS==='function'?apCS('nxc-status',['Active','Inactive'],statusF,'All Statuses'):'')
          +(typeof clearFiltersBtn==='function'?clearFiltersBtn([q,statusF],'ccpReset()'):'')+'<button class="lp-pill-search" onclick="ccpApply()">Search</button>',tiles):'')
      +(typeof ccSplit==='function'?ccSplit('nxc',table,sel!=null,panelHTML):table)
      +'</div>';
  }

  /* ── The ☰ panel: Details · Wallets · Logs · Workflow ── */
  function panelHTML(){
    const r=rec();if(!r||sel!==r.id)return '';
    const tabs=[{id:'details',label:'Details'},{id:'wallets',label:'Wallets'},{id:'logs',label:'Logs'},{id:'workflow',label:'Workflow'}];
    if(!tabs.some(function(t){return t.id===tab;}))tab='details';
    let body='';
    if(tab==='wallets')body=walletsHTML(r);
    else if(tab==='logs')body=logsHTML(r);
    else if(tab==='workflow')body=typeof wfTimelineHTML==='function'&&typeof wfDoneFromLogs==='function'?wfTimelineHTML(wfDoneFromLogs(r.logs)):'';
    else{
      const p=programme(r.entity),on=onList(r);
      body='<div class="nxc">'+cardImage(r)+'</div>'
        +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Details</span>'+badge(r.status==='Active'?'ok':'idle',r.status)+'</div>'
        +'<div class="lp-sb-detail-grid">'
        +fc('Card Name',E(r.name),true)
        +fcI('tag','Card Code',E(r.code))+fcI('bank','Issuing Bank',E(r.bank))
        +fc('Network',E(r.network))+fc('Card Type',E(r.type))
        +fc('Form',E(r.form))+fcI('money','Currency',E(r.currency))
        +fcI('users','KYC',E(r.kyc))+fcI('users','Cards Issued',String(issued(r.entity)))
        +fcI('cal','Validity',E(r.validity))+fcI('money','Annual Fee',E(r.fee))
        +fcI('cal','Launched On',E(r.launched))+fcI('flow','Programme',p?E(p.name)+(p.key?' ('+E(p.key)+')':''):'-')
        +fc('Wallets',on.length?E(on.map(function(w){return w[1];}).join(', ')):'None',true)
        +'</div>';
    }
    return (typeof axTabBar==='function'?axTabBar('nxc',tabs,tab,'ccpNav','ccpClose'):'')+'<div class="lp-isb-body">'+body+'</div>';
  }
  function walletsHTML(r){
    const ws=walletsOf(r.entity),cur=editing&&draft?draft:r.wallets,c=can(),n=ws.filter(function(w){return cur[w[0]]!==false;}).length;
    let h='<div class="nxc"><div class="lp-sb-view-header"><span class="lp-sb-section-title">Wallets</span>'
      +(c&&!editing?'<button class="lp-sb-view-edit-btn" onclick="ccpEdit()">'+(typeof SB_PEN!=='undefined'?SB_PEN+' ':'')+'Edit</button>':'<span class="wb-muted">'+n+' of '+ws.length+' on</span>')+'</div>';
    if(!ws.length)return h+'<div class="wb-empty-sm">No wallets are set up in Wallet &amp; Benefits yet.</div></div>';
    h+=ws.map(function(w){
      const on=cur[w[0]]!==false;
      return '<div class="nxc-w"><span class="nxc-w-name">'+E(w[1])+'</span>'
        +(editing?'':badge(on?'ok':'idle',on?'On':'Off'))
        +'<label class="cs-toggle" title="'+(editing?(on?'Turn off ':'Turn on ')+E(w[1]):(on?'On':'Off'))+'"'+(editing?'':' style="cursor:default"')+'><input type="checkbox" aria-label="'+E(w[1])+'"'+(on?' checked':'')+(editing?'':' disabled')
          +' onchange="ccpPick(\''+w[0]+'\',this.checked)"><span class="cs-toggle-slider"></span></label></div>';
    }).join('');
    if(editing)h+='<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccpCancel()">Cancel</button><button class="ep-save-btn" onclick="ccpSave()">Save changes</button></div>';
    return h+'</div>';
  }
  /* Logs: the record's history and its status move (Active / Inactive) with a comment, as on every listing. */
  function logsHTML(r){
    const on=r.status==='Active',next=on?'Inactive':'Active';
    const form=can()?'<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+(on?'active':'inactive')+'"></span>'+E(r.status)+'</div>'
      +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
      +(typeof apCS==='function'?apCS('nxc-log-status',[next],next,'Select Status'):'')
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="nxc-log-comment" placeholder="Comment"></textarea>'
      +'<button class="lp-logs-save-btn" onclick="ccpLogSave()">Save</button></div>':'';
    return typeof lpLogsView==='function'?(can()?lpLogsView(r.logs,form):lpLogsView(r.logs,'',{current:r.status,noAction:{title:'View only',sub:'Your role can view this card but not change it.'}})):'';
  }

  /* ── Actions ── */
  const repaint=function(){if(typeof isbTab==='function'&&document.getElementById('nxc-split-sb'))isbTab('nxc',panelHTML);else renderADTPage();};
  window.ccpApply=function(){q=typeof lpSearchValue==='function'?lpSearchValue('nxc-q'):'';const s=typeof getCSValue==='function'?getCSValue('nxc-status'):'';statusF=s==='All Statuses'?'':s||'';sel=null;renderADTPage();};
  window.ccpReset=function(){q='';statusF='';sel=null;renderADTPage();};
  window.ccpStat=function(s){statusF=statusF===s?'':s;sel=null;renderADTPage();};
  window.ccpOpen=function(id){
    if(sel!==id){editing=false;draft=null;}
    tab=typeof sbKeepTab==='function'?sbKeepTab(sel,tab):tab;sel=id;
    const sb=document.getElementById('nxc-split-sb');if(!sb){renderADTPage();return;}
    sb.classList.add('open');isbTab('nxc',panelHTML);
    document.querySelectorAll('.nxc-row').forEach(function(x){x.classList.toggle('lp-row-selected',x.id==='nxc-row-'+id);});
  };
  window.ccpClose=function(){sel=null;editing=false;draft=null;const sb=document.getElementById('nxc-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.nxc-row').forEach(function(x){x.classList.remove('lp-row-selected');});};
  window.ccpNav=function(t){tab=t;if(t!=='wallets'){editing=false;draft=null;}repaint();};
  window.ccpEdit=function(){const r=rec();if(!r||!can())return;editing=true;draft=Object.assign({},r.wallets);repaint();};
  window.ccpCancel=function(){editing=false;draft=null;repaint();};
  window.ccpPick=function(code,on){if(!editing||!draft)return;draft[code]=!!on;repaint();};
  window.ccpSave=function(){
    const r=rec();if(!r||!can()||!draft)return;
    const ws=walletsOf(r.entity),changed=ws.filter(function(w){return (r.wallets[w[0]]!==false)!==(draft[w[0]]!==false);});
    if(!changed.length){editing=false;draft=null;repaint();showToast('No changes','info');return;}
    if(!ws.some(function(w){return draft[w[0]]!==false;})){showToast('Keep one wallet on','error','A multiwallet card needs at least one wallet.');return;}
    ws.forEach(function(w){r.wallets[w[0]]=draft[w[0]]!==false;});
    const text='Wallets updated: '+changed.map(function(w){return w[1]+' '+(r.wallets[w[0]]?'on':'off');}).join(', ')+'.';
    log(r,r.status,text);editing=false;draft=null;renderADTPage();
    showToast('Wallets saved','success',r.name+' · '+text.replace('Wallets updated: ',''));
  };
  window.ccpLogSave=function(){
    const r=rec();if(!r||!can())return;
    const v=typeof getCSValue==='function'?getCSValue('nxc-log-status'):'',ta=document.getElementById('nxc-log-comment'),c=ta?String(ta.value||'').trim():'';
    if(!v||v===r.status){showToast('Pick the status','error');return;}
    if(!c){if(ta)ta.classList.add('is-invalid');showToast('Comment required','error','Write why the card is '+(v==='Active'?'activated':'made inactive')+'.');return;}
    r.status=v;log(r,v,(v==='Active'?'Activated':'Made inactive')+'. Comment: '+c);renderADTPage();
    showToast('Status updated','success',r.name+' is '+v+'.');
  };

  /* ── The menu item: "Cards", right under the existing Cards in Corporate Cards ── */
  if(typeof sidebarItems!=='undefined'){
    const g=sidebarItems.find(function(x){return x&&x.dropdown==='Corporate Cards';});
    if(g&&!g.children.some(function(c){return c.id===PG;})){
      const I=typeof sbIco!=='undefined'?sbIco:{},at=g.children.findIndex(function(c){return c.id==='card-list';});
      g.children.splice(at<0?0:at+1,0,{id:PG,label:'Cards',color:'green',icon:I.card||''});
    }
  }
  if(typeof supportPageMeta!=='undefined')supportPageMeta[PG]={title:'Cards',context:'Cards',filters:[],columns:[],rows:[]};
  if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE[PG]='cards';
  if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf(PG)<0)EMS_CLIENT_PAGES.push(PG);
  if(typeof appPagePermitted==='function'){
    const p0=appPagePermitted;
    appPagePermitted=function(pg){
      if(pg!==PG)return p0.apply(this,arguments);
      return p0('cards')&&(typeof ccAdminView!=='function'||ccAdminView());
    };
  }
  if(typeof renderPageContent==='function'){
    const r0=renderPageContent;
    renderPageContent=function(target){
      if(typeof page==='undefined'||page!==PG)return r0.apply(this,arguments);
      const el=typeof target==='string'?document.getElementById(target):target;if(!el)return;
      if(typeof emsApplyChrome==='function')emsApplyChrome();
      if(typeof emsPageGuard==='function'){const gd=emsPageGuard(page);if(gd){el.innerHTML=gd;return;}}
      seed();el.innerHTML=pageHTML();
    };
  }
  if(typeof getPageTitle==='function'){
    const t0=getPageTitle;
    getPageTitle=function(pg){return pg===PG?'Cards':t0.apply(this,arguments);};
  }
  if(typeof renderADTPage==='function'){
    const a0=renderADTPage;
    renderADTPage=function(){
      const out=a0.apply(this,arguments);
      if(typeof page!=='undefined'&&page===PG){const b=document.getElementById('tb-page-add-btn');if(b)b.style.display='none';}
      return out;
    };
  }
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){if(pg!==PG){editing=false;draft=null;}return n0.apply(this,arguments);};
  }
})();
