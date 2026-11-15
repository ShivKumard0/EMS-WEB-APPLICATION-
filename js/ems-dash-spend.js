/* ══ SPEND SUMMARY GRAPH ON THE DASHBOARD (product owner, 15 Nov 2026) ══════════════════════════════════════════════
   "in the company admin dashboard, and in the finance admin dashboard i want to show a spending graph" - one card
   under the four figures, above Action Required, for the Company Admin and the Finance Admin:
     left    spend this month, and the change against the same days of last month
     middle  one line: total company spend week by week - last 6 months (default) or last 12 months - or day by day
             for this month. Hovering ANYWHERE on the graph shows that week's (or day's) dates, amount and card /
             claims split ("if i hover in between the months anywhere on the graph it should show at that point
             details"), in one box placed beside the point, inside the graph.
     right   this month's requests: total, Pending Approval, Approved, Rejected (claims, advances, wallet requests)
   Spend is the Spend This Month figure's own definition (js/ems-dash-admin.js): posted card purchases plus approved
   claims the employee paid. The months before the company's records begin come from a monthly history (HIST) kept
   for this graph only, spread over that month's days (working days heavier than weekends): no transaction, claim,
   balance or list is added or changed.
   Only in the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof emsDashStatsHTML!=='function')return;
  const on=function(){return typeof emsDashOn==='function'&&emsDashOn()&&typeof emsRole==='function'&&['Company Admin','Finance Admin','Finance'].indexOf(emsRole())>=0;};
  const nova=function(){return typeof emsMfEnt==='function'?emsMfEnt():'';};
  /* [card spend, claims] per month, INR. */
  const HIST={'2025-11':[171200,22400],'2025-12':[168400,21300],'2026-01':[152900,18750],'2026-02':[161200,24100],'2026-03':[198600,31400],'2026-04':[174300,22800],'2026-05':[183700,26900],
    '2026-06':[176500,23600],'2026-07':[192800,28300],'2026-08':[187400,25100],'2026-09':[196400,27900],'2026-10':[214300,30800]};
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const today=function(){return typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10);};
  const p2=function(n){return (n<10?'0':'')+n;};
  const inr=function(n){return typeof expMoney==='function'?expMoney(Math.round(n),'INR'):'INR '+Math.round(n);};
  const short=function(n){
    const f=function(v,u){return (v>=10||v===Math.round(v)?Math.round(v):v.toFixed(1))+u;};
    return n>=1e7?f(n/1e7,'Cr'):n>=1e5?f(n/1e5,'L'):n>=1e3?f(n/1e3,'K'):String(Math.round(n));};
  const DAY=86400000;
  const utc=function(iso){const t=iso.split('-');return Date.UTC(+t[0],+t[1]-1,+t[2]);};
  const iso=function(ms){const d=new Date(ms);return d.getUTCFullYear()+'-'+p2(d.getUTCMonth()+1)+'-'+p2(d.getUTCDate());};
  const hash=function(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return ((h>>>0)%10000)/10000;};

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
  /* The history of a month over its days: day → [card, claims]; the days add up to the month's figures. */
  const histDays={};
  function histMonth(m){
    if(histDays[m])return histDays[m];
    const out={},h=HIST[m];if(!h)return (histDays[m]=out);
    const t=m.split('-'),n=new Date(Date.UTC(+t[0],+t[1],0)).getUTCDate(),WD=[0.3,1,1.1,1.15,1.2,1.25,0.55];
    [0,1].forEach(function(k){
      const w=[];let sum=0;
      for(let d=1;d<=n;d++){const key=m+'-'+p2(d),wd=new Date(utc(key)).getUTCDay();
        const v=(k?(wd===0||wd===6?0.15:1):WD[wd])*(0.7+0.6*hash(key+(k?'c':'k')));w.push(v);sum+=v;}
      let left=h[k];
      for(let d=1;d<=n;d++){const key=m+'-'+p2(d),v=d===n?left:Math.round(h[k]*w[d-1]/sum/10)*10;left-=v;(out[key]||(out[key]=[0,0]))[k]=v;}
    });
    return (histDays[m]=out);
  }
  function dayVal(key,rec){
    const h=idEntity()===nova()?(histMonth(key.slice(0,7))[key]||[0,0]):[0,0],r=rec[key]||[0,0];
    return [h[0]+r[0],h[1]+r[1]];
  }
  const dlabel=function(ms,withYear){const d=new Date(ms);return d.getUTCDate()+' '+MON[d.getUTCMonth()]+(withYear?' '+d.getUTCFullYear():'');};
  function series(mode){
    const end=utc(today()),rec=recorded(10),pts=[],ticks=[];
    if(mode==='month'){
      const n=new Date(end).getUTCDate();
      for(let i=1;i<=n;i++){const ms=end-(n-i)*DAY,v=dayVal(iso(ms),rec);pts.push({full:dlabel(ms,true),card:v[0],claim:v[1]});
        if(i===1||i===n||(i%2===1&&n-i>1))ticks.push({i:i-1,text:String(i)});}
    }else{
      const weeks=mode==='12'?52:26;
      for(let k=weeks-1;k>=0;k--){
        const to=end-k*7*DAY,from=to-6*DAY;let c=0,cl=0,first=-1;
        for(let ms=from;ms<=to;ms+=DAY){const v=dayVal(iso(ms),rec);c+=v[0];cl+=v[1];if(new Date(ms).getUTCDate()===1)first=ms;}
        const same=new Date(from).getUTCMonth()===new Date(to).getUTCMonth();
        pts.push({full:(same?new Date(from).getUTCDate():dlabel(from,false))+' – '+dlabel(to,true),card:c,claim:cl});
        if(first>=0)ticks.push({i:pts.length-1,text:MON[new Date(first).getUTCMonth()]});
      }
    }
    pts.forEach(function(p){p.v=p.card+p.claim;});
    return {pts:pts,ticks:ticks};
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
  let cur=[];   // the points on screen: {l,t} in % of the plot, and the details shown on hover
  function chartHTML(sr){
    const pts=sr.pts,n=pts.length;
    let max=Math.max.apply(null,pts.map(function(p){return p.v;}));if(!(max>0))max=1000;
    max*=1.08;   // headroom: the line never touches the top
    const mag=Math.pow(10,Math.floor(Math.log10(max))-1),step=[1,2,2.5,5,10,20,25,50,100].map(function(k){return k*mag;}).find(function(s){return Math.ceil(max/s)<=4;})||mag*100;
    const G=Math.max(2,Math.ceil(max/step)),top=step*G,ks=[];for(let k=G;k>=0;k--)ks.push(k);
    const X=function(i){return n===1?W/2:i*W/(n-1);},Y=function(v){return H-(v/top)*H;};
    /* A smooth line through every point that never overshoots (monotone cubic). */
    const xs=pts.map(function(p,i){return X(i);}),ys=pts.map(function(p){return Y(p.v);}),dl=[],ms=[];
    for(let i=0;i<n-1;i++)dl.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));
    for(let i=0;i<n;i++)ms.push(i===0?dl[0]||0:i===n-1?dl[n-2]||0:(dl[i-1]*dl[i]<=0?0:2*dl[i-1]*dl[i]/(dl[i-1]+dl[i])));
    let d='M'+xs[0].toFixed(1)+' '+ys[0].toFixed(1);
    for(let i=0;i<n-1;i++){const h=(xs[i+1]-xs[i])/3;
      d+=' C'+(xs[i]+h).toFixed(1)+' '+(ys[i]+ms[i]*h).toFixed(1)+' '+(xs[i+1]-h).toFixed(1)+' '+(ys[i+1]-ms[i+1]*h).toFixed(1)+' '+xs[i+1].toFixed(1)+' '+ys[i+1].toFixed(1);}
    const area=d+' L'+xs[n-1].toFixed(1)+' '+H+' L'+xs[0].toFixed(1)+' '+H+' Z';
    cur=pts.map(function(p,i){return {l:xs[i]/W*100,t:ys[i]/H*100,full:p.full,v:p.v,card:p.card,claim:p.claim};});
    const last=cur[n-1];
    return '<div class="ssg-plot">'
      +'<div class="ssg-y">'+ks.map(function(k){return '<span>'+(k?short(step*k):'0')+'</span>';}).join('')+'</div>'
      +'<div class="ssg-area" onmousemove="emsSpendHover(event,this)" onmouseleave="emsSpendHover(null,this)">'
        +ks.map(function(k){return '<i class="ssg-grid'+(k?'':' is-base')+'" style="top:'+((G-k)*100/G).toFixed(3)+'%"></i>';}).join('')
        +'<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ssg-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".14"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>'
        +'<path d="'+area+'" fill="url(#ssg-fill)"/><path d="'+d+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>'
        +'<i class="ssg-cross" id="ssg-cross"></i>'
        +'<i class="ssg-dot is-last" style="left:'+last.l.toFixed(3)+'%;top:'+last.t.toFixed(3)+'%"></i>'
        +'<i class="ssg-dot" id="ssg-dot"></i>'
        +'<div class="ssg-tip" id="ssg-tip"></div>'
      +'</div>'
      +'<div class="ssg-x">'+sr.ticks.map(function(t){const l=cur[t.i].l;
          return '<span style="left:'+l.toFixed(3)+'%;transform:translateX('+(l<2?'0':l>98?'-100%':'-50%')+')">'+t.text+'</span>';}).join('')+'</div>'
      +'</div>';
  }
  function cardHTML(){
    const mode=window.emsSpendMode||'6',sr=series(mode),h=headline(),q=requests();
    const opt=[['6','Last 6 months'],['12','Last 12 months'],['month','This month']];
    const row=function(l,v,c){return '<div class="ssg-rq"><span class="ssg-rq-l"><i class="ssg-key '+c+'"></i>'+l+'</span><span class="ssg-rq-v">'+inr(v)+'</span></div>';};
    return '<div class="ssg-card" id="ssg-card">'
      +'<div class="ssg-left"><div class="ssg-label">Spend This Month</div><div class="ssg-num">'+inr(h.now)+'</div>'
        +(h.ch==null?'<div class="ssg-sub">claims and card spend</div>':'<div class="ssg-sub"><b class="ssg-chg '+(h.ch>0?'up':h.ch<0?'down':'')+'">'+(h.ch>=0?'▲ ':'▼ ')+Math.abs(h.ch)+'%</b> vs the same days last month</div>')
        +'<div class="ssg-split"><div><span>Cards</span><b>'+inr(h.card)+'</b></div><div><span>Claims</span><b>'+inr(h.claim)+'</b></div></div></div>'
      +'<div class="ssg-mid"><div class="ssg-head"><div><div class="ssg-title">Spend Summary</div><div class="ssg-cap">'+(mode==='month'?'Daily spend':'Weekly spend')+' · cards and claims</div></div>'
        +'<select class="ssg-sel" aria-label="Period" onchange="emsSpendSet(this.value)">'+opt.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===mode?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></div>'
        +chartHTML(sr)+'</div>'
      +'<div class="ssg-right"><div class="ssg-label">Requests This Month</div><div class="ssg-num">'+inr(q.total)+'</div>'
        +'<div class="ssg-sub">'+(q.n?q.n+' request'+(q.n===1?'':'s'):'no requests yet')+'</div>'
        +'<div class="ssg-rqs">'+row('Pending Approval',q.pend,'p')+row('Approved',q.appr,'a')+row('Rejected',q.rej,'r')+'</div></div>'
      +'</div>';
  }
  window.emsSpendSet=function(v){window.emsSpendMode=v;const el=document.getElementById('ssg-card');if(el)el.outerHTML=cardHTML();};
  /* Hover anywhere on the plot: the nearest week (or day) under the pointer. One box, beside the point, kept inside the plot. */
  window.emsSpendHover=function(ev,area){
    const tip=document.getElementById('ssg-tip'),dot=document.getElementById('ssg-dot'),cross=document.getElementById('ssg-cross');
    if(!tip||!dot||!cross)return;
    if(!ev||!cur.length){[tip,dot,cross].forEach(function(e){e.classList.remove('on');});return;}
    const r=area.getBoundingClientRect(),n=cur.length;
    const i=Math.max(0,Math.min(n-1,Math.round((ev.clientX-r.left)/r.width*(n-1)))),p=cur[i];
    tip.innerHTML='<span class="ssg-tip-d">'+p.full+'</span><b>'+inr(p.v)+'</b>'
      +'<span class="ssg-tip-r"><span>Cards</span><span>'+inr(p.card)+'</span></span><span class="ssg-tip-r"><span>Claims</span><span>'+inr(p.claim)+'</span></span>';
    dot.style.left=cross.style.left=p.l+'%';dot.style.top=p.t+'%';
    const px=p.l/100*r.width,py=p.t/100*r.height,tw=tip.offsetWidth,th=tip.offsetHeight;
    tip.style.left=(px+14+tw>r.width?px-14-tw:px+14)+'px';
    tip.style.top=Math.max(0,Math.min(r.height-th,py-th/2))+'px';
    [tip,dot,cross].forEach(function(e){e.classList.add('on');});
  };
  const s0=emsDashStatsHTML;
  emsDashStatsHTML=function(){
    const out=s0.apply(this,arguments);
    if(!on())return out;
    try{return out+cardHTML();}catch(e){if(window.console)console.warn('[spend graph]',e);return out;}
  };
})();
