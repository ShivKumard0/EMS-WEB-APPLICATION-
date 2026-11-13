/* ══ SIGN UP → SIGN IN → A PENDING LINE IN COMPANY SETTINGS (product owner, 13 Nov 2026) ═════════════════════════════
   "when I sign up and fill the details, the sign-in page opens; with that email and password I sign in to Dhi
   Hyperlocal as the Super Admin. The details filled at sign up make one line item in Administration → Company Settings,
   status Pending, details not available blank; from its Logs, activating it with a comment makes it Active. In Company
   Settings, Dhi Hyperlocal reads Nova Retail Pvt Ltd. Nothing is linked or mapped; nothing else is affected."
   In the presentation:
   - Sign up checks every field and both boxes, keeps the details and goes back to Sign in with the email filled in.
   - Sign in with that email and password: Dhi Hyperlocal as the OpenDhi Super Admin. A wrong password is refused;
     every other email signs in exactly as before.
   - Company Settings (Dhi Hyperlocal only) lists each sign-up after the company's own row: Entity = Store Name, Type =
     Store Category, Country, Owner = First + Last name, Status Pending; Entity ID blank until activated, then the next
     ID (display only). Its panel: Basic Details (blank where sign up did not ask) and Logs (Active / Inactive with a
     comment, dated and timed). No company, user or access is created; Nova Retail, Dhi Hyperlocal and every other
     record are unchanged.
   - Company Settings shows Dhi Hyperlocal's own row as "Nova Retail Pvt Ltd" (that list and its panel only).
   Kept in this browser under its own key; Reset presentation data clears it. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const KEY='adt-pres-signups',SHOWN_AS='Nova Retail Pvt Ltd';
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const esc=function(s){return typeof sbEsc==='function'?sbEsc(s):String(s==null?'':s);};
  let recs=[];try{recs=JSON.parse(localStorage.getItem(KEY)||'[]')||[];}catch(e){recs=[];}
  const save=function(){try{localStorage.setItem(KEY,JSON.stringify(recs));}catch(e){}};
  /* The password is not kept as typed: only a fingerprint to compare at sign in. */
  const hash=function(email,p){let h=2166136261;const s=String(email).toLowerCase()+'|'+p;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
  const find=function(email){const e=String(email||'').trim().toLowerCase();return e?recs.find(function(r){return r.email.toLowerCase()===e;}):null;};
  const stamp=function(d){d=d||new Date();const h=d.getHours(),m=d.getMinutes(),s=d.getSeconds();
    return {date:d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear(),time:(h%12||12)+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s+' '+(h>=12?'PM':'AM')};};
  const when=function(iso){const d=new Date(iso),h=d.getHours(),m=d.getMinutes();return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear()+' | '+(h%12||12)+':'+(m<10?'0':'')+m+' '+(h>=12?'PM':'AM');};
  const dhi=function(){return (typeof entitiesData!=='undefined'?entitiesData:[]).find(function(e){return /Dhi Hyperlocal/i.test(e.name);})||null;};
  const inDhi=function(){const d=dhi();return !!(d&&typeof idEntity==='function'&&idEntity()===d.entityId);};

  /* ── 1 · Sign up ── */
  const val=function(id){const e=document.getElementById(id);return e?String(e.value||'').trim():'';};
  const bad=function(id,msg){const el=document.getElementById(id);showToast(msg,'error');
    if(el&&el.classList){el.classList.add('is-bad');if(el.focus)el.focus();setTimeout(function(){el.classList.remove('is-bad');},1600);}};
  /* Get OTP (product owner, 13 Nov 2026): the message as before, then four boxes under the mobile number; any four
     digits verify it. Changing the number asks again. Sign up needs the number verified. */
  const otpOk=function(){const b=document.getElementById('su-otp');return !!(b&&b.dataset.ok==='1');};
  const otpReset=function(){const b=document.getElementById('su-otp');if(b)b.remove();const g=document.getElementById('su-otp-get');if(g){g.disabled=false;g.style.opacity='';}};
  const otpCheck=function(){
    const box=document.getElementById('su-otp');if(!box)return;
    const ds=box.querySelectorAll('.su-otp-d'),code=Array.prototype.map.call(ds,function(x){return x.value;}).join('');
    if(!/^\d{4}$/.test(code))return;
    box.dataset.ok='1';
    ds.forEach(function(x){x.readOnly=true;x.style.background='var(--bg,#f9fafb)';});
    const ok=document.getElementById('su-otp-ok');if(ok)ok.style.display='';
    const h=document.getElementById('su-otp-hint');if(h)h.textContent='Mobile number verified.';
    const g=document.getElementById('su-otp-get');if(g){g.disabled=true;g.style.opacity='.55';}
    const n=document.getElementById('su-fname');if(n&&!n.value)n.focus();
  };
  window.suOtpKey=function(e,i){
    const ds=document.querySelectorAll('#su-otp .su-otp-d');
    if(e.key==='Backspace'&&!ds[i].value&&i>0){ds[i-1].value='';ds[i-1].focus();e.preventDefault();}
  };
  window.suOtpIn=function(el,i){
    const ds=document.querySelectorAll('#su-otp .su-otp-d');
    const v=String(el.value||'').replace(/\D/g,'');
    if(v.length>1){v.slice(0,4-i).split('').forEach(function(c,k){ds[i+k].value=c;});const nx=ds[Math.min(i+v.length,3)];if(nx)nx.focus();}   // a pasted code fills the boxes
    else{el.value=v;if(v&&i<3)ds[i+1].focus();}
    otpCheck();
  };
  if(typeof window.lgSuOtp==='function'){
    const o0=window.lgSuOtp;
    window.lgSuOtp=function(){
      const m=val('su-mobile').replace(/[\s-]/g,'');
      if(!m)return bad('su-mobile','Enter your mobile number');
      if(!/^\d{7,15}$/.test(m))return bad('su-mobile','Enter a valid mobile number');
      if(otpOk())return;
      o0.apply(this,arguments);
      let box=document.getElementById('su-otp');
      const dial=val('su-dial').replace(/^\w+\(|\)$/g,'');
      if(!box){
        const row=document.getElementById('su-mobile').parentElement;
        box=document.createElement('div');box.id='su-otp';box.style.margin='2px 0 14px';
        let d='';for(let i=0;i<4;i++)d+='<input class="lg-input su-otp-d" type="text" inputmode="numeric" maxlength="4" autocomplete="one-time-code" aria-label="OTP digit '+(i+1)+'"'
          +' style="width:48px;height:46px;flex:none;margin:0;padding:0;text-align:center;font-size:18px;font-weight:600" oninput="suOtpIn(this,'+i+')" onkeydown="suOtpKey(event,'+i+')">';
        box.innerHTML='<label class="lg-label">Enter OTP <span class="req">*</span></label>'
          +'<div style="display:flex;align-items:center;gap:10px">'+d+'<span id="su-otp-ok" style="display:none">'+(typeof axBadge==='function'?axBadge('ok','Verified'):'<span class="lp-status-badge tone-ok">Verified</span>')+'</span></div>'
          +'<p class="lg-sub" id="su-otp-hint" style="text-align:left;margin:8px 0 0;font-size:12.5px"></p>';
        row.parentNode.insertBefore(box,row.nextSibling);
        const g=row.querySelector('button');if(g)g.id='su-otp-get';
        /* A different number is verified again. */
        ['su-mobile','su-dial'].forEach(function(id){const el=document.getElementById(id);if(el&&!el.dataset.otpWatch){el.dataset.otpWatch='1';el.addEventListener(id==='su-dial'?'change':'input',otpReset);}});
      }else box.querySelectorAll('.su-otp-d').forEach(function(x){x.value='';});
      const h=document.getElementById('su-otp-hint');if(h)h.textContent='Enter the 4-digit code sent to '+(dial?dial+' ':'')+m+'.';
      const f=box.querySelector('.su-otp-d');if(f)f.focus();
    };
  }
  window.lgSuGo=function(){
    const d={dial:val('su-dial'),mobile:val('su-mobile').replace(/[\s-]/g,''),first:val('su-fname'),last:val('su-lname'),email:val('su-email'),
      store:val('su-store'),cat:val('su-cat'),country:val('su-country')};
    const p1=(document.getElementById('su-pass')||{}).value||'',p2=(document.getElementById('su-pass2')||{}).value||'';
    if(!d.mobile)return bad('su-mobile','Enter your mobile number');
    if(!/^\d{7,15}$/.test(d.mobile))return bad('su-mobile','Enter a valid mobile number');
    if(!otpOk()){const b=document.querySelector('#su-otp .su-otp-d');if(b){showToast('Verify your mobile number','error','Enter the 4-digit OTP.');b.focus();return;}return bad('su-mobile','Verify your mobile number: click Get OTP');}
    if(!d.first)return bad('su-fname','Enter your first name');
    if(!d.last)return bad('su-lname','Enter your last name');
    if(!d.email)return bad('su-email','Enter your email address');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))return bad('su-email','Enter a valid email address');
    if(!p1)return bad('su-pass','Enter a password');
    if(!p2)return bad('su-pass2','Re-enter the password');
    if(p1!==p2)return bad('su-pass2','The two passwords do not match');
    if(!d.store)return bad('su-store','Enter your store name');
    if(!d.cat)return bad('su-cat','Choose the store category');
    if(!d.country)return bad('su-country','Choose the country');
    if(!(document.getElementById('su-tc')||{}).checked)return bad('su-tc','Accept the Terms & Conditions');
    if(!(document.getElementById('su-msa')||{}).checked)return bad('su-msa','Accept the MSA');
    const now=new Date(),t=stamp(now),who=d.first+' '+d.last;
    let r=find(d.email);
    const log={date:t.date,time:t.time,user:who,status:'Pending',action:'Signed up. '+d.store+' · '+d.cat+' · '+d.country+'.'};
    if(r){Object.assign(r,d,{pass:hash(d.email,p1),status:'Pending',entityId:'',updated:now.toISOString()});r.logs.unshift(Object.assign(log,{action:'Signed up again. '+d.store+' · '+d.cat+' · '+d.country+'.'}));}
    else{r=Object.assign({},d,{pass:hash(d.email,p1),status:'Pending',entityId:'',created:now.toISOString(),updated:now.toISOString(),logs:[log]});recs.push(r);}
    save();
    if(typeof lgSuBack==='function')lgSuBack();
    const em=document.getElementById('lg-email'),pw=document.getElementById('lg-pass');
    if(em)em.value=d.email;if(pw){pw.value='';pw.focus();}
    showToast('Account created','success','Sign in with '+d.email+' and your password.');
  };

  /* ── 2 · Sign in with the sign-up email and password. Installed after the presentation's own sign-in (which lets
     any email in), so it is asked first; every other email goes on to it, unchanged. ── */
  window.addEventListener('load',function(){
    if(typeof lgSignIn!=='function')return;
    const si0=lgSignIn;
    lgSignIn=function(via){
      if(via==='google')return si0.apply(this,arguments);
      const em=document.getElementById('lg-email'),pw=document.getElementById('lg-pass'),r=find(em&&em.value);
      if(!r)return si0.apply(this,arguments);
      const pass=pw?pw.value:'';
      if(!pass){bad('lg-pass','Enter your password');return;}
      if(hash(r.email,pass)!==r.pass){
        if(typeof idUserByEmail==='function'&&idUserByEmail(r.email))return si0.apply(this,arguments);   // an existing person's email signs in as before
        bad('lg-pass','Incorrect password');return;
      }
      const res=typeof idSignIn==='function'?idSignIn(presStartEmail()):{error:'Sign-in is not available.'};
      if(res&&res.error){showToast('Cannot sign in','error',res.error);return;}
      const dh=dhi();if(dh){seSelectedEntity=dh.id;if(typeof appEntityChanged==='function')appEntityChanged();}
      const btn=document.getElementById('lg-submit');if(btn){btn.disabled=true;btn.textContent='Signing in…';}
      setTimeout(function(){
        if(btn){btn.disabled=false;btn.textContent='Sign in';}
        if(typeof lgEnter==='function')lgEnter();
        showToast('Welcome to Bhaiyaa','success','You are in Dhi Hyperlocal as the Super Admin.');
      },450);
    };
  });

  /* ── 3 · Company Settings: Dhi Hyperlocal's row reads Nova Retail Pvt Ltd; each sign-up follows it. ── */
  const rowNo=function(i){return 2+i;};
  const recOfRow=function(n){if(!inDhi())return null;const i=Number(n)-2;return i>=0&&i<recs.length?recs[i]:null;};
  const updatedCell=function(iso){const d=new Date(iso),n=new Date();return d.toDateString()===n.toDateString()?'Today':d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear();};
  if(typeof csEntityRows==='function'){
    const e0=csEntityRows;
    csEntityRows=function(){
      const rows=e0.apply(this,arguments),d=dhi();
      if(!d)return rows;
      const out=rows.map(function(r){if(r[2]!==d.entityId)return r;const c=r.slice();c[1]=SHOWN_AS;return c;});
      if(!inDhi())return out;
      return out.concat(recs.map(function(r,i){return [rowNo(i),r.store,r.entityId||'',r.cat,r.country,r.first+' '+r.last,updatedCell(r.updated),r.status];}));
    };
  }
  /* The sign-up's own panel: Basic Details and Logs. */
  let suTab='basic-details';
  window.suEntTab=function(t){suTab=t;if(typeof isbTab==='function')isbTab('cs',renderCsSidebar);};
  const I={
    ent:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    city:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
    flash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 6l7-3 8 4 7-3v15l-7 3-8-4-7 3z"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="7" x2="16" y2="21"/></svg>',
    person:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.07 6.07l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.76 16.92z"/></svg>',
    cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    id:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="7" y1="11" x2="10" y2="11"/><line x1="7" y1="15" x2="10" y2="15"/><path d="M14 11h3m-3 4h3"/></svg>',
    img:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'};
  const dash='<span style="color:#9ca3af">-</span>';
  const fc=function(icon,label,value,wide){return '<div class="lp-sb-field-card'+(wide?' is-wide':'')+'"><div class="lp-sb-field-icon">'+icon+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+(value?esc(value):dash)+'</div></div></div>';};
  function panelHTML(r){
    const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'}];
    if(!tabs.some(function(t){return t.id===suTab;}))suTab='basic-details';
    const bar='<div class="lp-isb-tabbar"><div class="lp-isb-tabs" id="cs-isb-tabs">'
      +tabs.map(function(t){return '<button class="lp-isb-tab'+(suTab===t.id?' active':'')+'" onclick="suEntTab(\''+t.id+'\')">'+t.label+'</button>';}).join('')+'</div>'
      +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeCsSidebar()" title="Close"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div></div>';
    /* The record's header card on both tabs, so the status in it is always the current one. */
    const hero=sbHero({icon:typeof sbIco!=='undefined'?sbIco.building:'',name:esc(r.store),meta:[esc(r.entityId),esc(r.cat),esc(r.country)],status:sbHeroBadge(r.status)});
    let body='';
    if(suTab==='logs'){
      const form='<div class="lp-logs-form">'
        +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--active"></span>'+esc(r.status)+'</div>'
        +'<p class="lp-logs-form-sub">Update entity status and add a comment</p>'
        +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
        +apCS('su-log-status-sel',['Active','Inactive'],'','Select Status')
        +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
        +'<textarea class="lp-logs-form-textarea" id="su-log-comment-inp" placeholder="Enter comment"></textarea>'
        +'<button class="lp-logs-save-btn" onclick="suEntSaveLog()">Save</button>'
        +'</div>';
      body=hero+lpLogsView(r.logs,form,{current:r.status});
    }else{
      const who=r.first+' '+r.last;
      body=hero
        +'<div class="lp-sb-detail-grid">'
        +fc(I.ent,'Entity ID',r.entityId)+fc(I.city,'Entity Name',r.store)+fc(I.flash,'Entity Type',r.cat)+fc(I.globe,'Country',r.country)
        +fc(I.map,'Address','',true)+fc(I.city,'City','')+fc(I.person,'Owner',who)
        +fc(I.mail,'Email',r.email)+fc(I.phone,'Mobile Number',(String(r.dial||'').replace(/^\w+\(|\)$/g,'')+' '+r.mobile).trim())
        +fc(I.cal,'Created Time',when(r.created))+fc(I.person,'Created By',who)+fc(I.cal,'Last Updated',when(r.updated))
        +fc(I.id,'Employee ID Pre fix','')+fc(I.img,'Entity Logo','')
        +'</div>';
    }
    return bar+'<div class="lp-isb-body">'+body+'</div>';
  }
  if(typeof renderCsSidebar==='function'){
    const p0=renderCsSidebar;
    renderCsSidebar=function(){const r=recOfRow(csSelectedItem);return r?panelHTML(r):p0.apply(this,arguments);};
  }
  /* The next Entity ID after every company's and every activated sign-up's. */
  const nextId=function(){let n=0;
    (typeof entitiesData!=='undefined'?entitiesData:[]).concat(recs).forEach(function(x){const m=/^ENT-(\d+)$/.exec(x.entityId||'');if(m)n=Math.max(n,Number(m[1]));});
    const s=String(n+1);return 'ENT-'+('00000'+s).slice(-Math.max(5,s.length));};
  window.suEntSaveLog=function(){
    const r=recOfRow(csSelectedItem);if(!r)return;
    const sel=typeof csTrigger==='function'?csTrigger('su-log-status-sel'):null,inp=document.getElementById('su-log-comment-inp');
    const status=typeof getCSValue==='function'?getCSValue('su-log-status-sel'):'',comment=inp?inp.value.trim():'';
    if(!status){if(sel){sel.style.borderColor='#b83a3a';setTimeout(function(){sel.style.borderColor='';},1500);}return;}
    if(!comment){if(inp){inp.style.borderColor='#b83a3a';inp.focus();setTimeout(function(){inp.style.borderColor='';},1500);}showToast('Add a comment','error');return;}
    const now=new Date(),t=stamp(now);
    if(status==='Active'&&!r.entityId)r.entityId=nextId();
    r.status=status;r.updated=now.toISOString();
    r.logs.unshift({date:t.date,time:t.time,user:typeof caN==='function'&&typeof idMe==='function'&&idMe()?caN(idMe()):'OpenDhi Super Admin',status:status,action:comment});
    save();
    showToast('Status updated','success',r.store+' is '+status+'.');
    if(typeof renderADTPage==='function')renderADTPage();
  };
  /* Reset presentation data clears the sign-ups too. */
  if(typeof presResetClick==='function'){
    const z0=presResetClick;
    presResetClick=function(){
      const out=z0.apply(this,arguments);
      let gone=false;try{gone=!localStorage.getItem(typeof PRES_KEY!=='undefined'?PRES_KEY:'adt-presentation-v1');}catch(e){}
      if(gone){recs=[];try{localStorage.removeItem(KEY);}catch(e){}}
      return out;
    };
  }
})();
