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
   - Company Settings shows Dhi Hyperlocal's own row as "Opendhi" (that list and its panel only; renamed from Nova Retail
     Pvt Ltd, product owner, 14 Nov 2026).
   Kept in this browser under its own key; Reset presentation data clears it. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const KEY='adt-pres-signups',SHOWN_AS='Opendhi';   // product owner, 14 Nov 2026: "Rename the Nova Retail Pvt Ltd to Opendhi"
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
  let realEnt=null;   // while a sign-up's Module Control is drawn under its own key: the real idEntity
  const inDhi=function(){const d=dhi(),f=realEnt||(typeof idEntity==='function'?idEntity:null);return !!(d&&f&&f()===d.entityId);};

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
    else{r=Object.assign({},d,{pass:hash(d.email,p1),status:'Pending',entityId:'',created:now.toISOString(),updated:now.toISOString(),logs:[log]});recs.push(r);norm(r);}
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

  /* ── 3 · Company Settings: the newest sign-up at the top, then Dhi Hyperlocal's own row (shown as Nova Retail Pvt
     Ltd). Row numbers stay with the record (Dhi Hyperlocal 1, the sign-ups 2, 3 …); the S. No column counts down
     the list as shown. ── */
  const rowNo=function(i){return 2+i;};
  function norm(r){
    if(!r.uid){let u=Date.parse(r.created)||Date.now();while(recs.some(function(x){return x!==r&&x.uid===u;}))u++;r.uid=u;}
    r.tabs=r.tabs||{};r.roles=r.roles||[];r.attachments=r.attachments||[];return r;
  }
  const recOfRow=function(n){if(!inDhi())return null;const i=Number(n)-2;return i>=0&&i<recs.length?norm(recs[i]):null;};
  const updatedCell=function(iso){const d=new Date(iso),n=new Date();return d.toDateString()===n.toDateString()?'Today':d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear();};
  const ownerOf=function(r){return (r.tabs&&r.tabs['basic-details']&&r.tabs['basic-details'].owner)||(r.first+' '+r.last);};
  let listing=false;   // true while the list itself is drawn: the sign-ups go first
  if(typeof csEntityRows==='function'){
    const e0=csEntityRows;
    csEntityRows=function(){
      const rows=e0.apply(this,arguments),d=dhi();
      if(!d)return rows;
      const out=rows.map(function(r){if(r[2]!==d.entityId)return r;const c=r.slice();c[1]=SHOWN_AS;return c;});
      if(!inDhi())return out;
      const su=recs.map(function(r,i){return [rowNo(i),r.store,r.entityId||'',r.cat,r.country,ownerOf(r),updatedCell(r.updated),r.status];});
      return listing?su.reverse().concat(out):out.concat(su);
    };
  }
  if(typeof buildCompanySettingsHTML==='function'){
    const b0=buildCompanySettingsHTML;
    buildCompanySettingsHTML=function(){
      if(!inDhi()||!recs.length)return b0.apply(this,arguments);
      listing=true;let out,order;
      try{out=b0.apply(this,arguments);order=csEntityRows().map(function(r){return String(r[0]);});}finally{listing=false;}
      const tmp=document.createElement('div');tmp.innerHTML=out;
      tmp.querySelectorAll('tr.lp-row[data-row-id]').forEach(function(tr){
        const pos=order.indexOf(tr.getAttribute('data-row-id'));if(pos<0||!tr.firstElementChild)return;
        const w=document.createTreeWalker(tr.firstElementChild,NodeFilter.SHOW_TEXT,null);let n;
        while((n=w.nextNode()))if(/^\s*\d+\s*$/.test(n.nodeValue)){n.nodeValue=String(pos+1);break;}
      });
      return tmp.innerHTML;
    };
  }

  /* ── 4 · The sign-up's panel: the company tabs (Basic Details, Banking Details, Attachments, Roles & Access,
     Payroll, Leaves, Attendance, Module Control, E-Sign) and Logs. Every value is the sign-up's own: blank until
     entered with Edit, saved with the row, written to its Logs. Dhi Hyperlocal's settings are never read or changed. ── */
  const TABS=[['basic-details','Basic Details'],['banking-details','Banking Details'],['attachments','Attachments'],['roles-access','Roles & Access'],
    ['payroll','Payroll'],['leaves','Leaves'],['attendance','Attendance'],['module-control','Module Control'],['card-setup','Card Setup'],['esign','E-Sign'],['logs','Logs']];
  const COUNTRIES=['India','United Arab Emirates','Singapore','United Kingdom','United States'];
  const CUR=['INR','AED','SGD','GBP','USD'],TZ=['Asia/Kolkata','Asia/Dubai','Asia/Singapore','Europe/London','America/New_York'];
  const YN=['Yes','No'],ED=['Enabled','Disabled'];
  const ROLES=['HR Admin','HR','Finance Admin','Admin','IT Lead','Finance Approver'];   // the product owner's list (13 Nov 2026)
  const F=function(k,l,o){return Object.assign({k:k,l:l},o||{});};
  const SECTIONS={
    'basic-details':[{fields:[F('entityId','Entity ID',{ro:1,ic:'ent'}),F('store','Entity Name',{top:1,req:1,ic:'city'}),F('cat','Entity Type',{top:1,opts:['Expense Management'],ic:'flash'}),
      F('country','Country',{top:1,opts:COUNTRIES,ic:'globe'}),F('baseCurrency','Base Currency',{opts:CUR,ic:'dollar'}),F('timeZone','Time Zone',{opts:TZ,ic:'globe'}),
      F('address','Address',{wide:1,area:1,ic:'map'}),F('city','City',{ic:'city'}),F('owner','Owner',{ic:'person'}),F('email','Email',{top:1,req:1,ic:'mail'}),
      F('mobile','Mobile Number',{top:1,req:1,ic:'phone'}),F('created','Created Time',{ro:1,ic:'cal'}),F('createdBy','Created By',{ro:1,ic:'person'}),
      F('updated','Last Updated',{ro:1,ic:'cal'}),F('empPrefix','Employee ID Prefix',{ic:'id'}),F('logo','Entity Logo',{file:1,ic:'img'}),
      F('header','Header',{file:1,ic:'doc'}),F('footer','Footer',{file:1,ic:'doc'})]}],
    'banking-details':[{title:'Banking Details',fields:[F('bkCountry','Country / Location',{opts:COUNTRIES,ic:'globe'}),F('payName','Pay Name',{ic:'person'}),F('payBank','Pay Bank',{ic:'bank'}),
      F('account','Account Number',{ic:'hash'}),F('ifsc','IFSC Code',{ic:'key'}),F('swift','Swift Code',{ic:'flash'}),F('bkCurrency','Currency',{opts:CUR,ic:'dollar'}),
      F('bkEmail','Email',{ic:'mail'}),F('bkPhone','Phone Number',{ic:'phone'}),F('vat','VAT Number',{ic:'pct'}),F('bkAttachment','Attachment',{file:1,ic:'clip'}),
      F('bkComments','Comments',{wide:1,area:1,ic:'comment'})]}],
    'payroll':[{title:'Payroll Settings',fields:[F('payCycle','Pay Cycle',{opts:['Monthly','Semi-monthly','Bi-weekly','Weekly'],ic:'person'}),F('cutoff','Payroll cut-off Date',{ic:'cal'}),
      F('calendar','Payroll Calendar',{ic:'cal'}),F('prCurrency','Currency',{opts:CUR,ic:'dollar'}),F('payslip','Payslip Publish Date',{wide:1,ic:'cal'})]},
      {title:'Payroll Input Rules',fields:[F('inclExp','Include Approved Expenses in Payroll',{opts:YN,ic:'check'}),F('deductLop','Deduct Unpaid Leave Automatically',{opts:YN,ic:'check'})]}],
    'leaves':[{title:'Leave Settings',fields:[F('period','Leave Period',{wide:1,ic:'cal'}),F('allocation','Allocation Frequency',{opts:['Monthly','Quarterly','Half-yearly','Yearly'],ic:'doc'}),
      F('probation','Probation Period',{ic:'clock'}),F('lop','LOP Allowed',{opts:YN,ic:'doc'}),F('optional','Optional Holidays',{ic:'cal'})]},
      {title:'Leave Restrictions',fields:[F('maxConsec','Maximum Consecutive Leaves',{wide:1,ic:'doc'})]},
      {title:'Sandwich Rule',fields:[F('sandwich','Sandwich Rule',{opts:ED,ic:'doc'}),F('cntWeekOff','Count Weekly Off as Leave',{opts:YN,ic:'cal'}),F('cntHoliday','Count Holiday as Leave',{opts:YN,wide:1,ic:'cal'})]},
      {title:'Approval Workflow',fields:[F('lvLevel','Leave Approval Level',{opts:['Level 1','Level 2'],wide:1,ic:'check'}),F('lvAppr1','Level 1 Approver',{ic:'person'}),F('lvAppr2','Level 2 Approver',{ic:'person'})]}],
    'attendance':[{title:'Attendance Settings',fields:[F('attMode','Attendance Mode',{ic:'clock'}),F('shift','Shift Type',{ic:'clock'}),F('dailyHours','Daily Work Hours',{ic:'clock'}),
      F('start','Start Time',{time:1,ic:'clock'}),F('end','End Time',{time:1,ic:'clock'}),F('workDays','Working Days',{ic:'cal'}),F('weekOff','Week Off Days',{ic:'cal'}),
      F('overtime','Overtime Allowed',{opts:YN,ic:'clock'}),F('capRule','Work Hours Capping Rule',{ic:'doc'}),F('late','Late Policy',{ic:'doc'}),F('geo','Geolocation',{opts:ED,ic:'map'}),
      F('graceIn','Clock In Grace Time',{ic:'clock'}),F('graceOut','Clock Out Grace Time',{ic:'clock'})]},
      {title:'Rules',fields:[F('freeze','Attendance Freeze',{opts:ED,ic:'doc'}),F('woReq','Request on Week Off / Holiday',{opts:['Allowed','Not allowed'],ic:'cal'}),
      F('woAppr','Approver',{ic:'person'}),F('abscond','Absconding Flow',{opts:ED,ic:'doc'}),F('absAction','Absence Action',{ic:'doc'})]}],
    'esign':[{title:'E-Sign',fields:[F('provider','Provider',{opts:['DocuSeal'],ic:'flash'}),F('env','Environment',{opts:['Sandbox','Production'],ic:'globe'}),
      F('baseUrl','API Base URL',{wide:1,ic:'globe'}),F('apiKey','API Key',{secret:1,ic:'key'}),F('esOn','Integration',{opts:ED,ic:'check'})]}]
  };
  const SV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">';
  const I={
    ent:SV+'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    city:SV+'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
    flash:SV+'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    globe:SV+'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    map:SV+'<path d="M1 6l7-3 8 4 7-3v15l-7 3-8-4-7 3z"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="7" x2="16" y2="21"/></svg>',
    person:SV+'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    mail:SV+'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    phone:SV+'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.07 6.07l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.76 16.92z"/></svg>',
    cal:SV+'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    id:SV+'<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="7" y1="11" x2="10" y2="11"/><line x1="7" y1="15" x2="10" y2="15"/><path d="M14 11h3m-3 4h3"/></svg>',
    img:SV+'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    doc:SV+'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    bank:SV+'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    hash:SV+'<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
    key:SV+'<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
    dollar:SV+'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    pct:SV+'<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
    clip:SV+'<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    comment:SV+'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    clock:SV+'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    check:SV+'<polyline points="20 6 9 17 4 12"/></svg>'};
  const PEN='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  const dash='<span style="color:#9ca3af">-</span>';
  const fc=function(icon,label,value,wide){return '<div class="lp-sb-field-card'+(wide?' is-wide':'')+'"><div class="lp-sb-field-icon">'+icon+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+esc(label)+'</div><div class="lp-sb-field-value">'+(value?esc(value):dash)+'</div></div></div>';};
  const dialOf=function(r){return String(r.dial||'').replace(/^\w+\(|\)$/g,'');};
  /* A field's value: the sign-up's own details, or what was entered on the tab. */
  function valOf(r,tab,f,forForm){
    if(f.k==='entityId')return r.entityId||'';
    if(f.k==='created')return when(r.created);
    if(f.k==='createdBy')return r.first+' '+r.last;
    if(f.k==='updated')return when(r.updated);
    if(f.k==='owner')return ownerOf(r);
    if(f.k==='mobile')return forForm?r.mobile:(dialOf(r)+' '+r.mobile).trim();
    if(f.top)return r[f.k]||'';
    const v=(r.tabs[tab]||{})[f.k]||'';
    if(f.secret&&v&&!forForm)return '•••• '+String(v).slice(-4);
    return v;
  }
  let suTab='basic-details',suEdit=null,suAdd=null;   // the open tab; the tab being edited {uid, tab}; the Add Member form
  const editing=function(r,tab){return !!(suEdit&&suEdit.uid===r.uid&&suEdit.tab===tab);};
  const editBtn=function(tab){return '<button class="lp-sb-view-edit-btn" onclick="suEditStart(\''+tab+'\')">'+PEN+' Edit</button>';};
  const heroOf=function(r,o){o=o||{};return sbHero({icon:typeof sbIco!=='undefined'?sbIco.building:'',name:esc(r.store),meta:[esc(r.entityId),esc(r.cat),esc(r.country)],
    status:sbHeroBadge(r.status),edit:o.edit,editing:o.editing});};
  const sectionTitle=function(t,right){return '<div class="lp-sb-view-header"'+(right===false?' style="margin-top:18px"':'')+'><span class="lp-sb-section-title">'+esc(t)+'</span>'+(right||'')+'</div>';};
  function fieldInput(f,v,i){
    const id='sue-'+i,lab='<label class="ep-form-label">'+esc(f.l)+(f.req?' <span class="req">*</span>':'')+'</label>';
    let inp;
    if(f.opts)inp=apCS(id,f.opts,v||'','Select');
    else if(f.area)inp='<textarea class="ep-form-input" id="'+id+'" rows="2">'+esc(v)+'</textarea>';
    else if(f.file)inp='<input type="hidden" id="'+id+'" value="'+attrSafe(v||'')+'"><div style="display:flex;align-items:center;gap:10px;min-height:38px">'
      +'<button type="button" class="btn btn-outline btn-sm" onclick="suFilePick(\''+id+'\')">'+(v?'Replace':'Upload')+'</button>'
      +'<span id="'+id+'-name" class="wb-muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(v?esc(v):'No file attached')+'</span></div>';
    else inp='<input class="ep-form-input" id="'+id+'" type="'+(f.time?'time':f.secret?'password':'text')+'" value="'+attrSafe(v||'')+'" placeholder="'+attrSafe(f.l)+'" autocomplete="off">';
    return '<div class="ep-form-group'+(f.wide?' ep-form-full':'')+'">'+lab+inp+'</div>';
  }
  function sectionHTML(r,tab){
    const groups=SECTIONS[tab],ed=editing(r,tab);
    if(ed){
      let i=0;
      const parts=groups.map(function(g,gi){
        const fs=g.fields.filter(function(f){return !f.ro;}).map(function(f){return fieldInput(f,valOf(r,tab,f,true),i++);}).join('');
        return (g.title?sectionTitle(g.title,gi?false:''):'')+'<div class="ep-form-grid">'+fs+'</div>';
      }).join('');
      return heroOf(r,{editing:true})+'<div class="lp-sb-edit-form ax-sb-edit"><div class="lp-sb-edit-section">'+parts
        +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="suEditCancel()">Cancel</button><button class="ep-save-btn" onclick="suEditSave()">Save changes</button></div></div></div>';
    }
    const first=tab==='basic-details';
    return heroOf(r,{edit:first?editBtn(tab):''})+groups.map(function(g,gi){
      return (g.title?sectionTitle(g.title,gi?false:editBtn(tab)):'')
        +'<div class="lp-sb-detail-grid">'+g.fields.map(function(f){return fc(I[f.ic]||I.doc,f.l,valOf(r,tab,f),f.wide);}).join('')+'</div>';
    }).join('');
  }
  function rolesHTML(r){
    const rows=[{name:r.first+' '+r.last,email:r.email,role:'Company Admin',added:when(r.created).split(' | ')[0],owner:true}].concat(r.roles);
    const add=suAdd&&suAdd===r.uid;
    const head=sectionTitle('Roles & Access',add?'':'<button class="lp-sb-view-edit-btn" onclick="suRoleAdd()">+ Add Member</button>');
    const form=add?'<div class="lp-sb-edit-form ax-sb-edit" style="margin-bottom:14px"><div class="lp-sb-edit-section"><div class="ep-form-grid">'
      +'<div class="ep-form-group"><label class="ep-form-label">Member Name <span class="req">*</span></label><input class="ep-form-input" id="sur-name" placeholder="Member Name" autocomplete="off"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Email <span class="req">*</span></label><input class="ep-form-input" id="sur-email" placeholder="Email" autocomplete="off"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Role <span class="req">*</span></label>'+apCS('sur-role',ROLES,'','Select Role')+'</div>'
      +'</div><div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="suRoleCancel()">Cancel</button><button class="ep-save-btn" onclick="suRoleSave()">Save changes</button></div></div></div>':'';
    const X='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
    const table='<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Sr. No</th><th>Member Name</th><th>Role</th><th>Added On</th><th></th></tr></thead><tbody>'
      +rows.map(function(m,i){return '<tr><td class="csag-td csag-num">'+(i+1)+'</td><td class="csag-td"><div class="lp-c-main">'+esc(m.name)+'</div><div class="lp-c-sub">'+esc(m.email)+'</div></td>'
        +'<td class="csag-td">'+esc(m.role)+'</td><td class="csag-td">'+esc(m.added)+'</td>'
        +'<td class="csag-td csag-act">'+(m.owner?'':'<button type="button" class="att-link" title="Remove" aria-label="Remove" onclick="suRoleRemove('+(i-1)+')">'+X+'</button>')+'</td></tr>';}).join('')
      +'</tbody></table></div>';
    return heroOf(r)+head+form+table;
  }
  /* Module Control: the same screen, kept for this sign-up alone (its own key, never Dhi Hyperlocal's). */
  const withEnt=function(r,fn){const e0=window.idEntity,outer=realEnt;realEnt=outer||e0;window.idEntity=function(){return 'SU-'+r.uid;};
    try{return fn();}finally{window.idEntity=e0;realEnt=outer;}};
  const suOn=function(){const r=typeof page!=='undefined'&&page==='settings'?recOfRow(csSelectedItem):null;return r&&suTab==='module-control'?r:null;};
  ['mcsToggle','mcsSub','mcsSave','mcsDiscard'].forEach(function(n){
    const f0=window[n];if(typeof f0!=='function')return;
    window[n]=function(){const r=suOn(),self=this,args=arguments;return r?withEnt(r,function(){return f0.apply(self,args);}):f0.apply(this,arguments);};
  });
  /* A sign-up's Module Control starts with every module and sub-module off; the Super Admin switches on what the
     company gets (product owner, 13 Nov 2026). Dhi Hyperlocal and Nova Retail keep theirs. A sign-up's set still at the
     untouched all-on start is turned off once; one already changed is kept. */
  function suMcOff(r){
    if(typeof mcShowBook==='undefined'||typeof mcTabHTML!=='function')return;
    const key='SU-'+r.uid;
    if(!mcShowBook[key])withEnt(r,function(){return mcTabHTML();});   // the screen makes its starting set
    const b=mcShowBook[key];if(!b||b.suInit)return;
    const mods=b.mods||{},subs=b.subs||{};
    const allOn=Object.keys(mods).every(function(k){return mods[k];})&&Object.keys(subs).every(function(k){return Object.keys(subs[k]).every(function(x){return subs[k][x];});});
    if(allOn){Object.keys(mods).forEach(function(k){mods[k]=false;});Object.keys(subs).forEach(function(k){Object.keys(subs[k]).forEach(function(x){subs[k][x]=false;});});}
    b.suInit=true;
    if(typeof presSaveSoon==='function')presSaveSoon();
  }
  function panelHTML(r){
    if(!TABS.some(function(t){return t[0]===suTab;}))suTab='basic-details';
    const chev=function(d){return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="'+(d==='left'?'15 18 9 12 15 6':'9 18 15 12 9 6')+'"/></svg>';};
    const bar='<div class="lp-isb-tabbar">'
      +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'cs-isb-tabs\')" title="Scroll left">'+chev('left')+'</button>'
      +'<div class="lp-isb-tabs" id="cs-isb-tabs">'+TABS.map(function(t){return '<button class="lp-isb-tab'+(suTab===t[0]?' active':'')+'" onclick="suEntTab(\''+t[0]+'\')">'+t[1]+'</button>';}).join('')+'</div>'
      +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'cs-isb-tabs\')" title="Scroll right">'+chev('right')+'</button>'
      +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeCsSidebar()" title="Close"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div></div>';
    let body='';
    if(SECTIONS[suTab])body=sectionHTML(r,suTab);
    else if(suTab==='attachments')body=heroOf(r)+sectionTitle('Attachments','')+(typeof attachTabHTML==='function'?attachTabHTML('su',r.uid):'');
    else if(suTab==='roles-access')body=rolesHTML(r);
    else if(suTab==='module-control'){suMcOff(r);body=heroOf(r)+(typeof mcTabHTML==='function'?withEnt(r,function(){return mcTabHTML();}):'');}
    else if(suTab==='card-setup')body=heroOf(r)+ccsHTML('SU-'+r.uid);
    else{
      const form='<div class="lp-logs-form">'
        +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--active"></span>'+esc(r.status)+'</div>'
        +'<p class="lp-logs-form-sub">Update entity status and add a comment</p>'
        +'<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
        +apCS('su-log-status-sel',['Active','Inactive'],'','Select Status')
        +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
        +'<textarea class="lp-logs-form-textarea" id="su-log-comment-inp" placeholder="Enter comment"></textarea>'
        +'<button class="lp-logs-save-btn" onclick="suEntSaveLog()">Save</button>'
        +'</div>';
      body=heroOf(r)+lpLogsView(r.logs,form,{current:r.status});
    }
    return bar+'<div class="lp-isb-body">'+body+'</div>';
  }
  if(typeof renderCsSidebar==='function'){
    const p0=renderCsSidebar;
    renderCsSidebar=function(){const r=recOfRow(csSelectedItem);return r?panelHTML(r):p0.apply(this,arguments);};
  }
  const actor=function(){return typeof caN==='function'&&typeof idMe==='function'&&idMe()?caN(idMe()):'OpenDhi Super Admin';};
  const logIt=function(r,text){const t=stamp();r.logs.unshift({date:t.date,time:t.time,user:actor(),status:r.status,action:text});};
  const repaint=function(){if(typeof isbTab==='function')isbTab('cs',renderCsSidebar);};
  window.suEntTab=function(t){suTab=t;suEdit=null;suAdd=null;repaint();};
  window.suEditStart=function(tab){const r=recOfRow(csSelectedItem);if(!r)return;suEdit={uid:r.uid,tab:tab};repaint();};
  window.suEditCancel=function(){suEdit=null;repaint();};
  window.suFilePick=function(id){
    const inp=document.createElement('input');inp.type='file';
    inp.addEventListener('change',function(){const f=inp.files&&inp.files[0];if(!f)return;
      if(f.size>10*1024*1024){showToast('File too large','error','"'+f.name+'" is over 10 MB.');return;}
      const h=document.getElementById(id);if(h)h.value=f.name;const n=document.getElementById(id+'-name');if(n)n.textContent=f.name;
      const b=n&&n.previousElementSibling;if(b)b.textContent='Replace';});
    inp.click();
  };
  window.suEditSave=function(){
    const r=recOfRow(csSelectedItem);if(!r||!suEdit||suEdit.uid!==r.uid)return;
    const tab=suEdit.tab,changed=[],vals={};let i=0;
    SECTIONS[tab].forEach(function(g){g.fields.forEach(function(f){if(f.ro)return;const id='sue-'+(i++);
      const v=f.opts?(typeof getCSValue==='function'?getCSValue(id):''):((document.getElementById(id)||{}).value||'');vals[f.k]=String(v||'').trim();});});
    const fieldOf=function(k){let x=null;SECTIONS[tab].forEach(function(g){g.fields.forEach(function(f){if(f.k===k)x=f;});});return x;};
    for(const k in vals){const f=fieldOf(k);if(f.req&&!vals[k]){showToast(f.l+' is required','error');return;}}
    if(vals.email!=null&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email)){showToast('Check the email','error','"'+vals.email+'" is not an email address.');return;}
    if(vals.bkEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.bkEmail)){showToast('Check the email','error','"'+vals.bkEmail+'" is not an email address.');return;}
    if(vals.mobile!=null){vals.mobile=vals.mobile.replace(/[\s-]/g,'');if(!/^\d{7,15}$/.test(vals.mobile)){showToast('Enter a valid mobile number','error');return;}}
    if(vals.email&&vals.email.toLowerCase()!==r.email.toLowerCase()&&find(vals.email)){showToast('Email already used','error','Another sign-up uses '+vals.email+'.');return;}
    const st=r.tabs[tab]=r.tabs[tab]||{};
    Object.keys(vals).forEach(function(k){const f=fieldOf(k),old=f.top?(r[k]||''):(k==='owner'?ownerOf(r):(st[k]||''));
      if(old===vals[k])return;changed.push(f.l);if(f.top)r[k]=vals[k];else st[k]=vals[k];});
    suEdit=null;
    const label=(TABS.find(function(t){return t[0]===tab;})||[0,''])[1];
    if(changed.length){r.updated=new Date().toISOString();logIt(r,label+' updated: '+changed.join(', ')+'.');save();}
    if(typeof renderADTPage==='function')renderADTPage();
    showToast('Saved','success',label+(changed.length?' updated: '+changed.join(', ')+'.':': nothing changed.'));
  };
  window.suRoleAdd=function(){const r=recOfRow(csSelectedItem);if(!r)return;suAdd=r.uid;repaint();const n=document.getElementById('sur-name');if(n)n.focus();};
  window.suRoleCancel=function(){suAdd=null;repaint();};
  window.suRoleSave=function(){
    const r=recOfRow(csSelectedItem);if(!r)return;
    const name=((document.getElementById('sur-name')||{}).value||'').trim(),email=((document.getElementById('sur-email')||{}).value||'').trim();
    const role=getCSValue('sur-role');
    if(!name){showToast('Enter the member name','error');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showToast('Enter a valid email address','error');return;}
    if(!role){showToast('Pick the role','error');return;}
    if(email.toLowerCase()===r.email.toLowerCase()||r.roles.some(function(m){return m.email.toLowerCase()===email.toLowerCase();})){showToast('Already a member','error',email+' is already listed.');return;}
    const t=stamp();r.roles.push({name:name,email:email,role:role,added:t.date});
    suAdd=null;logIt(r,'Invitation sent to '+name+' ('+email+') as '+role+'.');save();repaint();
    showToast('Invitation sent','success','An invitation to join '+r.store+' as '+role+' was sent to '+name+' at '+email+'.');
  };
  window.suRoleRemove=function(i){
    const r=recOfRow(csSelectedItem);if(!r||!r.roles[i])return;
    const m=r.roles.splice(i,1)[0];logIt(r,'Member removed: '+m.name+' ('+m.role+').');save();repaint();
    showToast('Member removed','success',m.name+' was removed.');
  };
  /* Attachments: the application's own drop zone, on the sign-up's own list. */
  if(typeof ATTACH_SCOPES!=='undefined'&&!ATTACH_SCOPES.su)ATTACH_SCOPES.su={find:function(id){const r=recs.find(function(x){return x.uid===Number(id);});return r?norm(r):null;}};
  if(typeof attachCommit==='function'){
    const c0=attachCommit;
    attachCommit=function(scope,id){
      if(scope!=='su')return c0.apply(this,arguments);
      const rec=attachRec('su',id),n0=rec?rec.attachments.length:0,out=c0.apply(this,arguments),now=attachRec('su',id);
      if(now&&now.attachments.length>n0){logIt(now,'Attachment added: '+now.attachments.slice(n0).map(function(a){return a.name;}).join(', ')+'.');save();}
      return out;
    };
  }
  if(typeof attachRemove==='function'){
    const x0=attachRemove;
    attachRemove=function(scope,id,i){
      if(scope!=='su')return x0.apply(this,arguments);
      const rec=attachRec('su',id),gone=rec&&rec.attachments[i]?rec.attachments[i].name:'',n0=rec?rec.attachments.length:0,out=x0.apply(this,arguments),now=attachRec('su',id);
      if(gone&&now&&now.attachments.length<n0){logIt(now,'Attachment removed: '+gone+'.');save();}
      return out;
    };
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
  /* ── 5 · Card Setup (product owner, 13 Nov 2026): the bank that issues the company's cards - one at a time - and,
     once a bank is enabled, the wallets on its card. In Dhi Hyperlocal for the Super Admin: on its own row's panel
     (after Module Control) and on every sign-up's. Each row keeps its own choice (Save changes / Discard); a sign-up's
     saves go to its Logs. Display only: nothing is linked to Corporate Cards or anything else. ── */
  const CCS_KEY='adt-pres-cardsetup';
  const CCS_BANKS=[['rbl','RBL Bank','RuPay prepaid multi-wallet card'],['icici','ICICI Bank','Multi-wallet prepaid card'],['sbi','SBI','Prepaid multi-wallet card']];
  const CCS_WALLETS=[['MEAL','Meal','Flexi Benefit'],['FUEL','Fuel','Flexi Benefit'],['GIFT','Gift','Flexi Benefit'],['TEL','Telecom','Flexi Benefit'],
    ['BOOK','Books & Learning','Benefit'],['WELL','Wellness','Benefit'],['CORP','Corporate Expense','Company Expense'],['REIMB','Reimbursement','Reimbursement'],
    ['PERS','Personal','Personal'],['NCMC','Transit / NCMC','Transit']];
  let ccsBook={};try{ccsBook=JSON.parse(localStorage.getItem(CCS_KEY)||'{}')||{};}catch(e){ccsBook={};}
  let ccsDraft=null;   // {key, bank, wallets} - changes not yet saved
  const ccsSaved=function(k){const b=ccsBook[k];return b?{bank:b.bank||'',wallets:Object.assign({},b.wallets||{})}:{bank:'',wallets:{}};};
  const ccsCur=function(k){return ccsDraft&&ccsDraft.key===k?ccsDraft:ccsSaved(k);};
  const ccsEdit=function(k){if(!ccsDraft||ccsDraft.key!==k)ccsDraft=Object.assign({key:k},ccsSaved(k));return ccsDraft;};
  const ccsSame=function(a,b){const w=function(x){return CCS_WALLETS.filter(function(v){return x.wallets[v[0]];}).map(function(v){return v[0];}).join();};return a.bank===b.bank&&w(a)===w(b);};
  const ccsDirty=function(k){return !!(ccsDraft&&ccsDraft.key===k&&!ccsSame(ccsDraft,ccsSaved(k)));};
  /* The row the panel is showing: a sign-up, or the company's own row. */
  const ccsKeyNow=function(){const r=recOfRow(csSelectedItem);return r?'SU-'+r.uid:(typeof idEntity==='function'?idEntity():'');};
  function ccsFormHTML(k){
    const c=ccsCur(k),bank=CCS_BANKS.find(function(b){return b[0]===c.bank;}),d=ccsDirty(k),ed=!!ccsSaved(k).bank;
    const n=CCS_WALLETS.filter(function(w){return c.wallets[w[0]];}).length;
    /* Wallets switch on and off with the same toggle as the banks (product owner, 13 Nov 2026). */
    const cb=function(on,js,name){return '<label class="cs-toggle" title="'+(on?'Turn off ':'Turn on ')+attrSafe(name)+'"><input type="checkbox" aria-label="'+attrSafe(name)+'"'+(on?' checked':'')+' onchange="'+js+'"><span class="cs-toggle-slider"></span></label>';};
    return '<div id="ccs-root" class="mcs">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span class="lp-sb-section-title">Card Setup</span>'
        +(d?(typeof axBadge==='function'?axBadge('wait','Unsaved changes'):'Unsaved changes'):'')+'</div>'
      +'<div style="font-size:11.5px;color:var(--gray,#6a7282);margin-top:6px">The bank that issues the company\'s cards, and the wallets on its card. One bank at a time.</div>'
      +'<div class="mcs-h">Banks</div>'
      /* A toggle per bank (product owner, 13 Nov 2026): while one is on, the other two are locked until it is turned off. */
      +CCS_BANKS.map(function(b){const on=c.bank===b[0],locked=!!c.bank&&!on,cur=locked?(CCS_BANKS.find(function(x){return x[0]===c.bank;})||[0,''])[1]:'';
        return '<div class="mcs-card"><div class="mcs-row"><div class="mcs-txt"><div class="mcs-name">'+esc(b[1])+'</div><div class="mcs-sub">'+esc(b[2])+'</div></div>'
          +'<label class="cs-toggle"'+(locked?' title="Turn off '+attrSafe(cur)+' first" style="cursor:not-allowed"':' title="'+(on?'Turn off':'Turn on')+' '+attrSafe(b[1])+'"')+'>'
            +'<input type="checkbox" aria-label="'+attrSafe(b[1])+'"'+(on?' checked':'')+(locked?' disabled':'')+' onchange="ccsBank(this.checked?\''+b[0]+'\':\'\')">'
            +'<span class="cs-toggle-slider"></span></label>'
          +'</div></div>';}).join('')
      +(bank?'<div class="mcs-h" style="display:flex;justify-content:space-between;align-items:center"><span>Add Wallets · '+esc(bank[1])+'</span>'
          +'<span style="font-size:12px;font-weight:500;color:var(--gray,#6a7282)">'+n+' of '+CCS_WALLETS.length+' selected</span></div>'
        +CCS_WALLETS.map(function(w){
          return '<div class="mcs-card ccs-wallet"><div class="mcs-row"><div class="mcs-txt"><div class="mcs-name">'+esc(w[1])+'</div><div class="mcs-sub">'+esc(w[2])+'</div></div>'
            +cb(!!c.wallets[w[0]],'ccsWallet(\''+w[0]+'\',this.checked)',w[1])+'</div></div>';}).join(''):'')
      /* Editing a saved setup: Cancel and Save changes are always there; a first setup shows them once something changed. */
      +(ed?'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccsCancel()">Cancel</button><button class="ep-save-btn" onclick="ccsSave()">Save changes</button></div>'
        :(d?'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccsDiscard()">Discard</button><button class="ep-save-btn" onclick="ccsSave()">Save changes</button></div>':''))
      +'</div>';
  }
  /* Once saved, Card Setup reads as what was selected - the bank and its wallets - with Edit to change it
     (product owner, 13 Nov 2026). Nothing saved yet: the selection itself. */
  let ccsEditing='';   // the row whose saved Card Setup is open for editing
  const CCS_TICK='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:#16a34a;flex:none" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  function ccsHTML(k){
    const s=ccsSaved(k);
    if(!s.bank||ccsEditing===k)return ccsFormHTML(k);
    const bank=CCS_BANKS.find(function(b){return b[0]===s.bank;})||['',s.bank,''];
    const ws=CCS_WALLETS.filter(function(w){return s.wallets[w[0]];});
    return '<div id="ccs-root" class="mcs">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span class="lp-sb-section-title">Card Setup</span>'
        +'<button class="lp-sb-view-edit-btn" onclick="ccsEditOn()">'+PEN+' Edit</button></div>'
      +'<div style="font-size:11.5px;color:var(--gray,#6a7282);margin-top:6px">The bank that issues the company&#39;s cards, and the wallets on its card.</div>'
      +'<div class="mcs-h">Bank</div>'
      +'<div class="mcs-card"><div class="mcs-row"><div class="mcs-txt"><div class="mcs-name">'+esc(bank[1])+'</div><div class="mcs-sub">'+esc(bank[2])+'</div></div>'
        +(typeof axBadge==='function'?axBadge('ok','Enabled'):'Enabled')+'</div></div>'
      +'<div class="mcs-h" style="display:flex;justify-content:space-between;align-items:center"><span>Wallets</span>'
        +'<span style="font-size:12px;font-weight:500;color:var(--gray,#6a7282)">'+ws.length+' of '+CCS_WALLETS.length+' selected</span></div>'
      +(ws.length?ws.map(function(w){return '<div class="mcs-card"><div class="mcs-row"><div class="mcs-txt"><div class="mcs-name">'+esc(w[1])+'</div><div class="mcs-sub">'+esc(w[2])+'</div></div>'+CCS_TICK+'</div></div>';}).join('')
        :'<div class="wb-empty-sm">No wallets selected. Click Edit to add them.</div>')
      +'</div>';
  }
  window.ccsEditOn=function(){ccsEditing=ccsKeyNow();ccsDraft=null;ccsPaint();};
  window.ccsCancel=function(){ccsDraft=null;ccsEditing='';ccsPaint();};
  const ccsPaint=function(){const el=document.getElementById('ccs-root');if(el)el.outerHTML=ccsHTML(ccsKeyNow());};
  window.ccsBank=function(b){const d=ccsEdit(ccsKeyNow());if(b&&d.bank&&d.bank!==b){ccsPaint();return;}d.bank=b;ccsPaint();};   // another bank waits until this one is off
  window.ccsWallet=function(w,on){const d=ccsEdit(ccsKeyNow());d.wallets=Object.assign({},d.wallets);if(on)d.wallets[w]=true;else delete d.wallets[w];ccsPaint();};
  window.ccsDiscard=function(){ccsDraft=null;ccsPaint();};
  window.ccsSave=function(){
    const k=ccsKeyNow();if(!ccsDirty(k)){ccsDraft=null;ccsEditing='';ccsPaint();return;}
    const d=ccsDraft,bank=CCS_BANKS.find(function(b){return b[0]===d.bank;});
    const ws=CCS_WALLETS.filter(function(w){return d.wallets[w[0]];}).map(function(w){return w[1];});
    ccsBook[k]={bank:d.bank,wallets:Object.assign({},d.wallets)};ccsDraft=null;ccsEditing='';
    try{localStorage.setItem(CCS_KEY,JSON.stringify(ccsBook));}catch(e){}
    const text=bank?bank[1]+' enabled; wallets: '+(ws.length?ws.join(', '):'none')+'.':'No bank enabled.';
    const r=recOfRow(csSelectedItem);if(r){logIt(r,'Card Setup updated: '+text);r.updated=new Date().toISOString();save();}
    ccsPaint();showToast('Card Setup saved','success',text);
  };
  /* The company's own row: a Card Setup tab after Module Control, for the Super Admin in Dhi Hyperlocal. */
  const ccsMainOn=function(){return inDhi()&&typeof emsRole==='function'&&emsRole()==='Super Admin';};
  if(typeof CS_GROUPS!=='undefined'&&!CS_GROUPS.some(function(g){return g.id==='cardsetup';})){
    const at=CS_GROUPS.findIndex(function(g){return g.id==='platform';});
    CS_GROUPS.splice(at<0?CS_GROUPS.length:at+1,0,{id:'cardsetup',label:'Card Setup',tabs:['cs-card-setup']});
  }
  if(typeof csExtraTabs==='function'){
    const x0=csExtraTabs;
    csExtraTabs=function(){const t=x0.apply(this,arguments);return ccsMainOn()?t.concat([{id:'cs-card-setup',label:'Card Setup'}]):t;};
  }
  if(typeof renderCsSidebar==='function'){
    const q0=renderCsSidebar;
    renderCsSidebar=function(){
      const out=q0.apply(this,arguments);
      if(recOfRow(csSelectedItem)||typeof csTab==='undefined'||csTab!=='cs-card-setup')return out;
      const tmp=document.createElement('div');tmp.innerHTML=out;
      const body=tmp.querySelector('.lp-isb-body');if(!body)return out;
      body.innerHTML=ccsHTML(idEntity());
      return tmp.innerHTML;
    };
  }
  /* Reset presentation data clears the sign-ups too. */
  if(typeof presResetClick==='function'){
    const z0=presResetClick;
    presResetClick=function(){
      const out=z0.apply(this,arguments);
      let gone=false;try{gone=!localStorage.getItem(typeof PRES_KEY!=='undefined'?PRES_KEY:'adt-presentation-v1');}catch(e){}
      if(gone){recs=[];try{localStorage.removeItem(KEY);localStorage.removeItem(CCS_KEY);}catch(e){}}
      return out;
    };
  }
})();
