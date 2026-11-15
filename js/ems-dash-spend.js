/* ══ SPEND SUMMARY GRAPH ON THE DASHBOARD (product owner, 15 Nov 2026) ══════════════════════════════════════════════
   "in the company admin dashboard, and in the finance admin dashboard i want to show a spending graph" - one card
   under the four figures, above Action Required, for the Company Admin and the Finance Admin:
     left    spend this month, and the change against the same days of last month
     middle  one line: total company spend - last 6 months (default), last 12 months, or this month day by day;
             hovering a point shows the amount and its card / claims split
     right   this month's requests: total, Pending Approval, Approved, Rejected (claims, advances, wallet requests)
   Spend is the Spend This Month figure's own definition (js/ems-dash-admin.js): posted card purchases plus approved
   claims the employee paid. The months before the company's records begin come from a monthly history (HIST) kept
   for this graph only: no transaction, claim, balance or list is added or changed.
   Only in the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof emsDashStatsHTML!=='function')return;
  const on=function(){return typeof emsDashOn==='function'&&emsDashOn()&&typeof emsRole==='function'&&['Company Admin','Finance Admin','Finance'].indexOf(emsRole())>=0;};
  const nova=function(){return typeof emsMfEnt==='function'?emsMfEnt():'';};
  /* [card spend, claims] per month, INR. */
  const HIST={'2025-12':[168400,21300],'2026-01':[152900,18750],'2026-02':[161200,24100],'2026-03':[198600,31400],'2026-04':[174300,22800],'2026-05':[183700,26900],
    '2026-06':[176500,23600],'2026-07':[192800,28300],'2026-08':[187400,25100],'2026-09':[196400,27900],'2026-10':[214300,30800]};
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const today=function(){return typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10);};
  const p2=function(n){return (n<10?'0':'')+n;};
  const inr=function(n){return typeof expMoney==='function'?expMoney(Math.round(n),'INR'):'INR '+Math.round(n);};
  const short=function(n){
    const f=function(v,u){return (v>=10||v===Math.round(v)?Math.round(v):v.toFixed(1))+u;};
    return n>=1e7?f(n/1e7,'Cr'):n>=1e5?f(n/1e5,'L'):n>=1e3?f(n/1e3,'K'):String(Math.round(n));};
  const esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');};

  /* Recorded spend: key → [card, claims]; key is the month (7) or the day (10). */
  function recorded(len){
    const ent=idEntity(),by={};
    const add=function(d,i,v){const k=String(d||'').slice(0,len);if(k.length<len||!(v>0))return;(by[k]||(by[k]=[0,0]))[i]+=v;};
    (typeof ccTxns!=='undefined'?ccTxns:[]).forEach(function(t){
      if(t.entity!==ent||t.direction!=='Debit'||t.status!=='Posted')return;
      add(t.date,0,Number(t.billCurrency==='INR'&&t.billAmount?t.billAmount:t.amount)||0);});
    (typeof expScope==='function'?expScope():[]).forEach(function(r){
      if(!r.pay||r.pay.status==='Not Applicable')return;
      if(['Approved','Partially Approved','Reimbursed'].indexOf(r.status)<0)return;
      add(r.appliedOn,1,Number(typeof caApprovedTotal==='function'?caApprovedTotal(r):0)||0);});
    return by;
  }
  function monthVal(m,rec){const h=idEntity()===nova()&&HIST[m]?HIST[m]:[0,0],r=rec[m]||[0,0];return [h[0]+r[0],h[1]+r[1]];}
  function series(mode){
    const t=today().split('-'),y=+t[0],m=+t[1],d=+t[2],pts=[];
    if(mode==='month'){
      const rec=recorded(10);
      for(let i=1;i<=d;i++){const v=rec[y+'-'+p2(m)+'-'+p2(i)]||[0,0];pts.push({x:String(i),full:i+' '+MON[m-1]+' '+y,card:v[0],claim:v[1]});}
    }else{
      const rec=recorded(7),n=mode==='12'?12:6;
      for(let i=n-1;i>=0;i--){let mm=m-i,yy=y;while(mm<1){mm+=12;yy--;}
        const v=monthVal(yy+'-'+p2(mm),rec);pts.push({x:MON[mm-1],full:MON[mm-1]+' '+yy+(i?'':' (to date)'),card:v[0],claim:v[1]});}
    }
    pts.forEach(function(p){p.v=p.card+p.claim;});
    return pts;
  }
  /* Left: this month to date against the same days of last month. */
  function headline(){
    const t=today().split('-'),y=+t[0],m=+t[1],d=+t[2],rec=recorded(7);
    let pm=m-1,py=y;if(pm<1){pm=12;py--;}
    const now=monthVal(y+'-'+p2(m),rec),before=monthVal(py+'-'+p2(pm),rec);
    const n=now[0]+now[1],days=new Date(py,pm,0).getDate(),b=(before[0]+before[1])*Math.min(d,days)/days;
    return {now:n,ch:b>0?Math.round((n-b)/b*100):null,card:now[0],claim:now[1]};
  }
  /* Right: this month's requests by outcome. */
  function requests(){
    const mon=today().slice(0,7),o={pend:0,appr:0,rej:0,n:0};
    const put=function(status,amt,date){
      if(String(date||'').slice(0,7)!==mon||!(amt>0))return;
      if(status==='Awaiting Approval')o.pend+=amt;
      else if(['Approved','Partially Approved','Reimbursed','Disbursed'].indexOf(status)>=0)o.appr+=amt;
      else if(status==='Rejected')o.rej+=amt;else return;
      o.n++;};
    try{(typeof eaRows==='function'?eaRows():[]).forEach(function(x){if(x.cur&&x.cur!=='INR')return;put(x.status,Number(x.req)||0,x.date||(x.r&&x.r.appliedOn));});}catch(e){}
    try{(typeof ccRqaItems==='function'?ccRqaItems():[]).forEach(function(x){if(x.kind!=='load'||!x.rec)return;
      put(x.rec.status,Number(x.rec.amount)||0,x.rec.date||x.rec.requestedOn||x.rec.createdOn||today());});}catch(e){}
    o.total=o.pend+o.appr+o.rej;
    return o;
  }

  const W=1000,H=200;
  function chartHTML(pts){
    let max=Math.max.apply(null,pts.map(function(p){return p.v;}));if(!(max>0))max=1000;
    const mag=Math.pow(10,Math.floor(Math.log10(max))-1),step=[1,2,2.5,5,10,20,25,50,100].map(function(k){return k*mag;}).find(function(s){return Math.ceil(max/s)<=5;})||mag*100;
    const G=Math.max(2,Math.ceil(max/step)),top=step*G,n=pts.length,ks=[];for(let k=G;k>=0;k--)ks.push(k);
    const X=function(i){return n===1?W/2:(i+0.5)*W/n;},Y=function(v){return H-(v/top)*H;};
    let d='';
    pts.forEach(function(p,i){const x=X(i),y=Y(p.v);
      if(!i)d='M'+x.toFixed(1)+' '+y.toFixed(1);
      else{const x0=X(i-1),y0=Y(pts[i-1].v),xm=((x0+x)/2).toFixed(1);d+=' C'+xm+' '+y0.toFixed(1)+' '+xm+' '+y.toFixed(1)+' '+x.toFixed(1)+' '+y.toFixed(1);}});
    const area=d+' L'+X(n-1).toFixed(1)+' '+H+' L'+X(0).toFixed(1)+' '+H+' Z';
    const every=n>16?5:1;
    const lab=function(i){return every===1||i===0||(i+1)%every===0;};
    return '<div class="ssg-plot">'
      +'<div class="ssg-y">'+ks.map(function(k){return '<span>'+(k?short(step*k):'0')+'</span>';}).join('')+'</div>'
      +'<div class="ssg-area">'
        +ks.map(function(k){return '<i class="ssg-grid'+(k?'':' is-base')+'" style="top:'+((G-k)*100/G).toFixed(3)+'%"></i>';}).join('')
        +'<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ssg-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".16"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>'
        +'<path d="'+area+'" fill="url(#ssg-fill)"/><path d="'+d+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>'
        +pts.map(function(p,i){const l=(X(i)/W*100).toFixed(3),t=(Y(p.v)/H*100).toFixed(3);
          return '<div class="ssg-col" style="left:'+(i*100/n).toFixed(3)+'%;width:'+(100/n).toFixed(3)+'%" data-tip="'+esc(p.full+'|'+inr(p.v)+'|Cards '+inr(p.card)+' · Claims '+inr(p.claim))+'" data-l="'+l+'" data-t="'+t+'" onmouseenter="emsSpendTip(this)" onmouseleave="emsSpendTip(null)">'
            +'<i class="ssg-dot'+(i===n-1?' is-last':'')+'" style="top:'+t+'%"></i></div>';}).join('')
        +'<div class="ssg-tip" id="ssg-tip"></div>'
      +'</div>'
      +'<div class="ssg-x">'+pts.map(function(p,i){return '<span>'+(lab(i)?p.x:'')+'</span>';}).join('')+'</div>'
      +'</div>';
  }
  function cardHTML(){
    const mode=window.emsSpendMode||'6',pts=series(mode),h=headline(),q=requests();
    const opt=[['6','Last 6 months'],['12','Last 12 months'],['month','This month']];
    const row=function(l,v,c){return '<div class="ssg-rq"><span class="ssg-rq-l"><i class="ssg-key '+c+'"></i>'+l+'</span><span class="ssg-rq-v">'+inr(v)+'</span></div>';};
    return '<div class="ssg-card" id="ssg-card">'
      +'<div class="ssg-left"><div class="ssg-label">Spend This Month</div><div class="ssg-num">'+inr(h.now)+'</div>'
        +(h.ch==null?'<div class="ssg-sub">claims and card spend</div>':'<div class="ssg-sub"><b class="ssg-chg '+(h.ch>0?'up':h.ch<0?'down':'')+'">'+(h.ch>=0?'▲ ':'▼ ')+Math.abs(h.ch)+'%</b> vs the same days last month</div>')
        +'<div class="ssg-split"><div><span>Cards</span><b>'+inr(h.card)+'</b></div><div><span>Claims</span><b>'+inr(h.claim)+'</b></div></div></div>'
      +'<div class="ssg-mid"><div class="ssg-head"><div class="ssg-title">Spend Summary</div>'
        +'<select class="ssg-sel" aria-label="Period" onchange="emsSpendSet(this.value)">'+opt.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===mode?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></div>'
        +chartHTML(pts)+'</div>'
      +'<div class="ssg-right"><div class="ssg-label">Requests This Month</div><div class="ssg-num">'+inr(q.total)+'</div>'
        +'<div class="ssg-sub">'+(q.n?q.n+' request'+(q.n===1?'':'s'):'no requests yet')+'</div>'
        +'<div class="ssg-rqs">'+row('Pending Approval',q.pend,'p')+row('Approved',q.appr,'a')+row('Rejected',q.rej,'r')+'</div></div>'
      +'</div>';
  }
  window.emsSpendSet=function(v){window.emsSpendMode=v;const el=document.getElementById('ssg-card');if(el)el.outerHTML=cardHTML();};
  window.emsSpendTip=function(col){
    const tip=document.getElementById('ssg-tip');if(!tip)return;
    if(!col){tip.classList.remove('on');return;}
    const p=String(col.getAttribute('data-tip')||'').split('|'),l=parseFloat(col.getAttribute('data-l'));
    tip.innerHTML='<span>'+p[0]+'</span><b>'+p[1]+'</b><em>'+p[2]+'</em>';
    tip.style.left=l+'%';tip.style.top=col.getAttribute('data-t')+'%';
    tip.classList.toggle('to-left',l>72);tip.classList.toggle('to-right',l<28);
    tip.classList.add('on');
  };
  const s0=emsDashStatsHTML;
  emsDashStatsHTML=function(){
    const out=s0.apply(this,arguments);
    if(!on())return out;
    try{return out+cardHTML();}catch(e){if(window.console)console.warn('[spend graph]',e);return out;}
  };
})();
