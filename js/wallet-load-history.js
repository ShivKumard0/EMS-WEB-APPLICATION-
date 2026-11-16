/* ══ WALLET LOAD HISTORY (product owner, 16 Nov 2026) ══════════════════════════════════════════════════════════════
   "Make a new tab under Wallet Load ... filter for year, month, branch; after selecting and searching show the last 6
   months' load history line-item wise; on clicking a line item I should see a quick summary; on clicking view I should
   see the list of all the people below with the action button to see that particular month's load; on the line item a
   download button so that I can download the list in Excel format."
   Corporate Cards → Wallet Load History, right under Wallet Load, for the same people who see Wallet Load.
   - Filters: Year, Month, Branch. With a month picked the list is that month alone; with no month it is the last six
     months of the year picked, newest first (product owner, 16 Nov 2026, later: "if I select a month show me that
     particular month, or else show the previous 6 to 7 months").
   - A line is one month's load. Its action button opens the usual side panel ("make it work like our regular action
     button"): Details (totals, each wallet's load, who reviewed, approved and disbursed), then Employee Loads (every
     employee's card of that month; the action button on an employee opens their wallet statement for the month).
   - Download gives the month's list as an Excel workbook.
   Read only. The figures are the ones Wallet Load shows for an earlier month (js/benefit-processing.js, histMonth), so
   a month here and the same month in a card's Wallets tab always agree. Nothing is stored and no load, review,
   approval, disbursement or balance is changed. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const A=window.bpxApi;if(!A||typeof sidebarItems==='undefined'||typeof renderPageContent!=='function')return;
  const PG='wallet-load-history',TITLE='Wallet Load History',SPAN=6;
  const E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const p2=function(n){return (n<10?'0':'')+n;},MON=A.MON,money=A.money;
  const badge=function(tone,t){return typeof axBadge==='function'?axBadge(tone,t):E(t);};
  const say=function(a,t,b){if(typeof showToast==='function')showToast(a,t,b);};
  const lastDone=function(){return A.prevOf(A.nowM());};
  const DL='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const X='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  let fYear=null,fMonth=0,fBranch='',openM=null,tab='details',pop=null;   // fMonth 0: no month picked, the last six months
  const year=function(){return fYear||+lastDone().slice(0,4);};

  /* ── One month ── */
  let cache={};
  function monthOf(m){
    const key=A.ent()+'|'+m+'|'+fBranch+'|'+A.nowM();
    if(cache[key])return cache[key];
    const types=A.benefitTypes(),rows=[];
    A.cards().forEach(function(c){
      if(fBranch&&A.branchOf(c)!==fBranch)return;
      const h=A.histMonth(c,m);if(!h)return;
      const ks=types.filter(function(t){return h[t];}).concat(Object.keys(h).filter(function(t){return types.indexOf(t)<0;}));
      const T=function(k){return ks.reduce(function(a,t){return a+h[t][k];},0);};
      rows.push({card:c,h:h,ks:ks,open:T('open'),loaded:T('loaded'),spent:T('spent'),close:T('close')});
    });
    if(!rows.length)return (cache[key]=null);
    const S=function(k){return rows.reduce(function(a,r){return a+r[k];},0);},byW={},wOrder=[];
    rows.forEach(function(r){r.ks.forEach(function(t){if(byW[t]==null){byW[t]=0;wOrder.push(t);}byW[t]+=r.h[t].loaded;});});
    wOrder.sort(function(a,b){const i=types.indexOf(a),j=types.indexOf(b);return (i<0?99:i)-(j<0?99:j);});
    const emps={};rows.forEach(function(r){emps[r.card.employeeEid||r.card.id]=1;});
    /* The load goes out on the first working day of the month. */
    const t=m.split('-'),d=new Date(+t[0],+t[1]-1,1);while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()+1);
    const run=A.runs().find(function(r){return r.month===m;});
    const day=p2(d.getDate())+' '+MON[d.getMonth()].slice(0,3)+' '+d.getFullYear();
    const admin=(function(){const u=typeof idUserByEmail==='function'?idUserByEmail('karan.shah@opendhi.in'):null;return u&&typeof idName==='function'?idName(u.userId):'Company Admin';})();
    return (cache[key]={month:m,ref:'WL-'+t[0]+'-'+t[1],rows:rows,emps:Object.keys(emps).length,open:S('open'),loaded:S('loaded'),spent:S('spent'),close:S('close'),
      byW:byW,wOrder:wOrder,on:run&&run.at?String(run.at).split(' | ')[0]:day,by:run&&run.by?run.by:A.financeName(),reviewedBy:admin,approvedBy:A.financeName()});
  }
  function months(){
    const out=[],y=year();
    if(fMonth){const x=monthOf(y+'-'+p2(fMonth));if(x)out.push(x);return out;}
    let m=y===+A.nowM().slice(0,4)?lastDone():y+'-12';
    for(let i=0;i<SPAN;i++){const x=monthOf(m);if(x)out.push(x);m=A.prevOf(m);}
    return out;
  }

  /* ── The page ── */
  const I=function(){return typeof AX_ICO!=='undefined'?AX_ICO:{};};
  const F=function(ico,l,v){return typeof axField==='function'?axField(ico||'',l,v):'';};
  function panelHTML(){
    const x=openM?monthOf(openM):null;if(!x)return '';
    const tabs=[{id:'details',label:'Details'},{id:'employees',label:'Employee Loads'}];
    if(!tabs.some(function(t){return t.id===tab;}))tab='details';
    const i=I(),hero=typeof sbHero==='function'?sbHero({icon:(typeof sbIco!=='undefined'&&(sbIco.wallet||sbIco.card))||'',name:E(A.mLabel(x.month)),meta:[E(x.ref),E(fBranch||'All branches'),x.rows.length+' card'+(x.rows.length===1?'':'s')],status:badge('ok','Disbursed')}):'';
    const dl='<button type="button" class="btn-outline btn-sm wlh-ibtn" onclick="wlhDownload(\''+x.month+'\')">'+DL+'<span>Download Excel</span></button>';
    let body='';
    if(tab==='employees'){
      body=hero+'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Employee Loads · '+E(A.mLabel(x.month))+'</span>'+dl+'</div>'
        +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table wlh-st wlh-emp"><thead><tr><th>#</th><th>Employee</th><th>Department</th><th class="wlh-num">Loaded</th><th class="wlh-num">Spent</th><th class="wlh-num">Balance</th><th>Action</th></tr></thead><tbody>'
        +x.rows.map(function(r,n){
          const c=r.card,e=A.emp(c);
          return '<tr style="cursor:pointer" onclick="wlhEmp(\''+x.month+'\','+c.id+')"><td class="csag-td">'+(n+1)+'</td>'
            +'<td class="csag-td"><div class="lp-c-main">'+E(A.empName(c))+'</div><div class="lp-c-sub">'+E([e.empId,A.keyOf(c)].filter(Boolean).join(' · '))+'</div></td>'
            +'<td class="csag-td"><div class="lp-c-plain">'+E(e.dept||'—')+'</div><div class="lp-c-sub">'+E(A.branchOf(c)||'')+'</div></td>'
            +'<td class="csag-td wlh-num" style="font-weight:600">'+money(r.loaded)+'</td><td class="csag-td wlh-num">'+money(r.spent)+'</td><td class="csag-td wlh-num">'+money(r.close)+'</td>'
            +(typeof csuDots==='function'?csuDots('wlhEmp(\''+x.month+'\','+c.id+')',A.empName(c)).replace('<td ','<td class="csag-td" '):'<td class="csag-td"></td>')+'</tr>';
        }).join('')
        +'<tr class="wlh-tot"><td class="csag-td"></td><td class="csag-td"><div class="lp-c-main">Total</div></td><td class="csag-td"></td><td class="csag-td wlh-num">'+money(x.loaded)+'</td><td class="csag-td wlh-num">'+money(x.spent)+'</td><td class="csag-td wlh-num">'+money(x.close)+'</td><td class="csag-td"></td></tr>'
        +'</tbody></table></div>';
    }else{
      body=hero+'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Load Summary</span>'+dl+'</div><div class="lp-sb-detail-grid">'
        +F(i.fCal,'Load Month',E(A.mLabel(x.month)))+F(i.fHash,'Reference',E(x.ref))
        +F(i.fCash,'Total Load','<b>'+money(x.loaded)+'</b>')+F(i.fBuild,'Branch',E(fBranch||'All branches'))
        +F(i.fUser,'Employees',x.emps)+F(i.fHash,'Cards Loaded',x.rows.length)
        +'</div><div class="lp-sb-view-header"><span class="lp-sb-section-title">Load by Wallet</span></div><div class="lp-sb-detail-grid">'
        +x.wOrder.map(function(t){return F(i.fCash,A.wName(t)+' Wallet',money(x.byW[t]));}).join('')
        +'</div><div class="lp-sb-view-header"><span class="lp-sb-section-title">Balances</span></div><div class="lp-sb-detail-grid">'
        +F(i.fCash,'Opening Balance',money(x.open))+F(i.fCash,'Total Loaded',money(x.loaded))
        +F(i.fCash,'Total Spent',money(x.spent))+F(i.fCash,'Closing Balance',money(x.close))
        +'</div><div class="lp-sb-view-header"><span class="lp-sb-section-title">Processing</span></div><div class="lp-sb-detail-grid">'
        +F(i.fTag,'Status',badge('ok','Disbursed'))+F(i.fCal,'Disbursed On',E(x.on))
        +F(i.fUser,'Reviewed By',E(x.reviewedBy))+F(i.fUser,'Approved By',E(x.approvedBy))+F(i.fUser,'Disbursed By',E(x.by))
        +'</div>';
    }
    return (typeof axTabBar==='function'?axTabBar('wlh',tabs,tab,'wlhNav','wlhClose'):'')+'<div class="lp-isb-body">'+body+'</div>';
  }
  function pageHTML(){
    cache={};if(A.prepare)A.prepare();
    const ms=months(),ny=+A.nowM().slice(0,4),nm=+A.nowM().slice(5,7),y=year(),years=[];
    for(let k=+A.HIST_START.slice(0,4);k<=ny;k++)years.push(String(k));
    if(openM&&!ms.some(function(x){return x.month===openM;}))openM=null;
    const filters=(typeof apCS==='function'?apCS('wlh-year',years,String(y),'Year')+apCS('wlh-month',y===ny?MON.slice(0,nm):MON,fMonth?MON[fMonth-1]:'','All Months')
        +apCS('wlh-branch',typeof emsBranchNames==='function'?emsBranchNames(A.ent()):[],fBranch,'All Branches'):'')
      +(typeof clearFiltersBtn==='function'?clearFiltersBtn([fBranch,fMonth?'x':''],'wlhReset()'):'')+'<button class="lp-pill-search" onclick="wlhApply()">Search</button>';
    const tot=ms.reduce(function(a,x){return a+x.loaded;},0);
    const tiles=typeof caStat==='function'?caStat('Months',ms.length,false,'','info')+caStat('Total Loaded',money(tot).replace(/\s*INR$/,''),false,'','ok'):'';
    const trs=ms.map(function(x,n){
      return '<tr class="wlh-row'+(openM===x.month?' lp-row-selected':'')+'" id="wlh-row-'+x.month+'" style="cursor:pointer" onclick="wlhOpen(\''+x.month+'\')">'
        +'<td class="lp-c-n">'+(n+1)+'</td>'
        +'<td><div class="lp-c-main">'+E(A.mLabel(x.month))+'</div><div class="lp-c-sub">'+E(x.ref)+'</div></td>'
        +'<td><div class="lp-c-plain">'+x.emps+'</div></td>'
        +'<td><div class="lp-c-plain">'+x.rows.length+'</div></td>'
        +'<td class="wlh-amt"><div class="lp-c-plain" style="font-weight:600">'+money(x.loaded)+'</div></td>'
        +'<td class="wlh-amt"><div class="lp-c-plain">'+money(x.spent)+'</div></td>'
        +'<td><div class="lp-c-plain">'+E(x.on)+'</div></td>'
        +'<td>'+badge('ok','Disbursed')+'</td>'
        +'<td onclick="event.stopPropagation()"><button type="button" class="wlh-dl" title="Download '+E(A.mLabel(x.month))+' in Excel" aria-label="Download '+E(A.mLabel(x.month))+' in Excel" onclick="wlhDownload(\''+x.month+'\')">'+DL+'</button></td>'
        +(typeof csuDots==='function'?csuDots('wlhOpen(\''+x.month+'\')',A.mLabel(x.month)):'<td></td>')+'</tr>';
    }).join('');
    const none=fMonth?'No wallet load was processed in '+MON[fMonth-1]+' '+y+(fBranch?' for '+fBranch:'')+'.':'No wallet load was processed in '+y+(fBranch?' for '+fBranch:'')+'.';
    const table='<table class="lp-table ax-table cc-table wlh-table wlh-months"><thead><tr><th>S. No</th><th>Load Month</th><th>Employees</th><th>Cards</th><th>Total Loaded</th><th>Total Spent</th><th>Disbursed On</th><th>Status</th><th>Download</th><th>Action</th></tr></thead><tbody>'
      +(trs||(typeof ccEmpty==='function'?ccEmpty(10,none):''))+'</tbody></table>';
    const cap=!ms.length?'':fMonth?'Wallet load of '+A.mLabel(ms[0].month):'Last '+ms.length+' month'+(ms.length===1?'':'s')+' of wallet loads · '+A.mLabel(ms[ms.length-1].month)+' – '+A.mLabel(ms[0].month);
    return '<div class="lp-page wlh-page">'
      +(typeof ccFilterBar==='function'?ccFilterBar(filters,tiles):'')
      +(cap?'<div class="wlh-cap">'+E(cap)+(fBranch?' · '+E(fBranch):'')+'</div>':'')
      +(typeof ccSplit==='function'?ccSplit('wlh',table,openM!=null,panelHTML):table)
      +'</div>';
  }
  /* One employee's month, over the page. */
  function popHTML(){
    if(!pop)return '';
    const x=monthOf(pop.month),r=x&&x.rows.find(function(q){return q.card.id===pop.id;});if(!r)return '';
    const c=r.card,e=A.emp(c),tile=function(l,v,tone){return '<div class="wlh-ht"><div class="wlh-ht-l">'+l+'</div><div class="wlh-ht-v"'+(tone?' style="color:'+tone+'"':'')+'>'+v+'</div></div>';};
    return '<div class="ct-modal-overlay" style="z-index:2000" onclick="wlhEmpClose()"><div class="ct-modal wlh-modal" role="dialog" aria-modal="true" aria-label="Wallet load of '+E(A.empName(c))+'" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr"><div><span class="ct-modal-title">'+E(A.empName(c))+' · '+E(A.mLabel(x.month))+'</span>'
      +'<div style="font-size:13px;color:#6b7280;margin-top:3px">'+E([e.empId,A.keyOf(c),A.cardNo(c),e.dept,A.branchOf(c)].filter(Boolean).join(' · '))+'</div></div>'
      +'<button class="ct-modal-close" onclick="wlhEmpClose()" aria-label="Close">'+X+'</button></div>'
      +'<div class="wlh-modal-body">'
      +'<div class="wlh-hts">'+tile('Opening Balance',money(r.open))+tile('Loaded',money(r.loaded),'#15803d')+tile('Spent',money(r.spent),'#b45309')+tile('Closing Balance',money(r.close))+'</div>'
      +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table wlh-st"><thead><tr><th>Wallet</th><th class="wlh-num">Opening Balance</th><th class="wlh-num">Loaded</th><th class="wlh-num">Spent</th><th class="wlh-num">Closing Balance</th></tr></thead><tbody>'
      +r.ks.map(function(t){const w=r.h[t];return '<tr><td class="csag-td"><div class="lp-c-main">'+E(A.wName(t))+'</div></td><td class="csag-td wlh-num">'+money(w.open)+'</td><td class="csag-td wlh-num">'+money(w.loaded)+'</td><td class="csag-td wlh-num">'+money(w.spent)+'</td><td class="csag-td wlh-num" style="font-weight:600">'+money(w.close)+'</td></tr>';}).join('')
      +'<tr class="wlh-tot"><td class="csag-td"><div class="lp-c-main">Total</div></td><td class="csag-td wlh-num">'+money(r.open)+'</td><td class="csag-td wlh-num">'+money(r.loaded)+'</td><td class="csag-td wlh-num">'+money(r.spent)+'</td><td class="csag-td wlh-num">'+money(r.close)+'</td></tr>'
      +'</tbody></table></div>'
      +'<div class="wlh-meta">Disbursed on '+E(x.on)+' by '+E(x.by)+' · '+E(x.ref)+'</div>'
      +'</div><div class="ct-modal-foot"><span></span><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="wlhEmpClose()">Close</button></div></div></div></div>';
  }
  const root=function(){let el=document.getElementById('wlh-pop-root');if(!el){el=document.createElement('div');el.id='wlh-pop-root';document.body.appendChild(el);}return el;};
  const paintPop=function(){root().innerHTML=popHTML();};
  const redraw=function(){if(typeof renderADTPage==='function')renderADTPage();};

  /* ── Actions ── */
  window.wlhApply=function(){
    if(typeof getCSValue==='function'){
      const y=+getCSValue('wlh-year'),mo=MON.indexOf(getCSValue('wlh-month')),b=getCSValue('wlh-branch');
      if(y)fYear=y;
      fMonth=mo>=0?mo+1:0;
      if(fMonth&&fYear+'-'+p2(fMonth)>A.nowM())fMonth=+A.nowM().slice(5,7);
      fBranch=b&&b!=='All Branches'?b:'';
    }
    redraw();
  };
  window.wlhReset=function(){fYear=null;fMonth=0;fBranch='';openM=null;tab='details';redraw();};
  const repanel=function(){if(typeof isbTab==='function'&&document.getElementById('wlh-split-sb'))isbTab('wlh',panelHTML);else redraw();};
  window.wlhOpen=function(m){
    if(openM!==m)tab='details';
    openM=m;
    const sb=document.getElementById('wlh-split-sb');if(!sb||typeof isbTab!=='function'){redraw();return;}
    sb.classList.add('open');isbTab('wlh',panelHTML);
    document.querySelectorAll('.wlh-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='wlh-row-'+m);});
  };
  window.wlhClose=function(){openM=null;tab='details';const sb=document.getElementById('wlh-split-sb');if(sb)sb.classList.remove('open');document.querySelectorAll('.wlh-row').forEach(function(r){r.classList.remove('lp-row-selected');});};
  window.wlhNav=function(t){tab=t;repanel();};
  window.wlhEmp=function(m,id){pop={month:m,id:id};paintPop();};
  window.wlhEmpClose=function(){pop=null;paintPop();};
  window.wlhDownload=function(m){
    const x=monthOf(m);if(!x){say('Nothing to download','info','No wallet load was processed for '+A.mLabel(m)+'.');return;}
    if(typeof tsxWorkbook!=='function'||typeof tsxSave!=='function'){say('Download is not available','error');return;}
    const ws=x.wOrder,head=['S. No','Employee','Employee ID','Card Reference','Card Number','Department','Branch'].concat(ws.map(function(t){return A.wName(t)+' Loaded';})).concat(['Total Loaded','Total Spent','Opening Balance','Closing Balance','Status']);
    const rows=x.rows.map(function(r,i){const c=r.card,e=A.emp(c);
      return [i+1,A.empName(c),e.empId||'',A.keyOf(c),A.cardNo(c),e.dept||'',A.branchOf(c)||''].concat(ws.map(function(t){return r.h[t]?r.h[t].loaded:0;})).concat([r.loaded,r.spent,r.open,r.close,'Disbursed']);});
    rows.push(['','Total','','','','',''].concat(ws.map(function(t){return x.byW[t];})).concat([x.loaded,x.spent,x.open,x.close,'']));
    const who=typeof idMeName==='function'?idMeName():'',ename=typeof idEntityName==='function'?idEntityName(A.ent()):'';
    tsxSave(tsxWorkbook([{name:A.mLabel(m),title:'Wallet Load · '+A.mLabel(m),
      meta:[(ename?ename+' · ':'')+x.ref+' · '+(fBranch||'All branches')+' · disbursed on '+x.on,'Amounts in INR. Card numbers are masked.'+(who?' Downloaded by '+who+'.':'')],
      columns:head.map(function(h,i){return {label:h,w:i===1?24:i===0?7:Math.max(12,Math.min(22,h.length+3))};}),rows:rows}]),'wallet-load-'+m+(fBranch?'-'+fBranch.toLowerCase().replace(/[^a-z0-9]+/g,'-'):'')+'.xlsx');
    say('Download ready','success',A.mLabel(m)+' · '+x.rows.length+' card'+(x.rows.length===1?'':'s')+' · '+money(x.loaded)+'.');
  };

  /* ── Look ── */
  (function css(){
    if(document.getElementById('wlh-style'))return;
    const st=document.createElement('style');st.id='wlh-style';
    st.textContent='.wlh-cap{margin:16px 2px 10px;font-size:13px;color:var(--gray,#6a7282)}'
      +'#wlh-split-sb .lp-sb-detail-grid+.lp-sb-view-header{margin-top:20px}'
      +'.wlh-table{margin:0}.wlh-table th,.wlh-table td{text-align:left}.wlh-table>thead>tr>th{white-space:nowrap}.wlh-amt{white-space:nowrap;font-variant-numeric:tabular-nums}'
      +'.wlh-dl{width:32px;height:32px;border:1px solid var(--border,#e5e7eb);border-radius:9px;background:#fff;color:var(--navy,#0f172a);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}'
      +'.wlh-dl:hover{background:#f1f5f9}.wlh-ibtn{display:inline-flex;align-items:center;gap:7px}'
      +'.wlh-emp th,.wlh-emp td{padding-left:8px!important;padding-right:8px!important}.wlh-emp td:last-child,.wlh-emp th:last-child{width:52px;text-align:center}.wlh-emp .lp-c-sub{white-space:normal}.wlh-emp td:first-child,.wlh-emp th:first-child{padding-left:14px!important;width:40px;white-space:nowrap}'
      +'.ct-modal.wlh-modal{width:min(760px,95vw);display:flex;flex-direction:column;max-height:88vh;overflow:hidden;border-radius:16px;padding-bottom:0}'
      +'.wlh-modal-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:6px 0 20px}'
      +'.wlh-modal>.ct-modal-foot{position:static;flex-shrink:0;margin:0 -28px;border-radius:0}'
      +'.wlh-hts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:10px 0 16px}'
      +'.wlh-ht{border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;padding:12px 14px;min-width:0}'
      +'.wlh-ht-l{font-size:12px;color:var(--gray,#6a7282);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.wlh-ht-v{font-size:16px;font-weight:600;color:var(--navy,#0f172a);font-variant-numeric:tabular-nums;white-space:nowrap}'
      +'table.wlh-st{min-width:0!important;width:100%}.wlh-num{text-align:right!important;white-space:nowrap;font-variant-numeric:tabular-nums}'
      +'.wlh-tot td{background:#f8fafc;font-weight:600;border-top:1px solid var(--border,#e5e7eb)}'
      +'.wlh-meta{margin-top:12px;font-size:12.5px;color:var(--gray,#6a7282)}'
      +'@media(max-width:900px){.wlh-hts{grid-template-columns:repeat(2,minmax(0,1fr))}}';
    (document.head||document.documentElement).appendChild(st);
  })();

  /* ── The menu item, right under Wallet Load; the page ── */
  const g=sidebarItems.find(function(x){return x&&x.dropdown==='Corporate Cards';});
  if(g&&!g.children.some(function(c){return c.id===PG;})){
    const I=typeof sbIco!=='undefined'?sbIco:{};
    const at=g.children.findIndex(function(c){return c.id==='benefit-processing';});
    g.children.splice(at<0?g.children.length:at+1,0,{id:PG,label:TITLE,color:'green',icon:I.doc||I.wallet||I.card||''});
  }
  if(typeof supportPageMeta!=='undefined')supportPageMeta[PG]={title:TITLE,context:TITLE,filters:[],columns:[],rows:[]};
  if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE[PG]='cards';
  if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf(PG)<0)EMS_CLIENT_PAGES.push(PG);
  if(typeof appPagePermitted==='function'){
    const p0=appPagePermitted;
    appPagePermitted=function(pg){
      if(pg!==PG)return p0.apply(this,arguments);
      return p0('cards')&&A.canSee();
    };
  }
  const r0=renderPageContent;
  renderPageContent=function(target){
    if(typeof page==='undefined'||page!==PG){if(pop){pop=null;paintPop();}return r0.apply(this,arguments);}
    const el=typeof target==='string'?document.getElementById(target):target;if(!el)return;
    if(typeof emsApplyChrome==='function')emsApplyChrome();
    if(typeof emsPageGuard==='function'){const gd=emsPageGuard(page);if(gd){el.innerHTML=gd;return;}}
    el.innerHTML=pageHTML();
  };
  if(typeof getPageTitle==='function'){
    const t0=getPageTitle;
    getPageTitle=function(pg){return pg===PG?TITLE:t0.apply(this,arguments);};
  }
  if(typeof renderADTPage==='function'){
    const a0=renderADTPage;
    renderADTPage=function(){
      const out=a0.apply(this,arguments);
      if(typeof page!=='undefined'&&page===PG){const b=document.getElementById('tb-page-add-btn');if(b)b.style.display='none';}
      return out;
    };
  }
})();
