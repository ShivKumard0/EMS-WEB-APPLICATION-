/* ══ SIGN UP ON THE SIGN-IN SCREEN (product owner, 12 Nov 2026) ═════════════════════════════════════════════════════
   "when I sign out and sign up: mobile number, first name, last name, email id, password, re-enter password, store name,
   store category, country, then two check boxes for accepting; after filling and clicking Sign up, whatever details I
   fill take me to Dhi Hyperlocal as the Super Admin. Only dummy values, to simulate the sign-up; don't change any other
   details or features." In the presentation, Sign up turns the sign-in card into this form (Back returns to sign in).
   Nothing entered is checked or kept, and no company or account is created: Sign up opens the app as the OpenDhi Super
   Admin in Dhi Hyperlocal, exactly like signing in. Get OTP only confirms on screen. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const CATS=['Expense Management'];
  const COUNTRIES=['India','United Arab Emirates','Singapore','United Kingdom','United States'];
  const EYE='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  let signInHTML=null;
  const card=function(){return document.querySelector('#v-login .lg-card');};
  const lbl=function(forId,text){return '<label class="lg-label" for="'+forId+'">'+text+' <span class="req">*</span></label>';};
  const inp=function(id,type,ph){return '<input class="lg-input" id="'+id+'" type="'+type+'" placeholder="'+ph+'" autocomplete="off">';};
  const pass=function(id,ph){return '<div class="lg-pass" style="margin-bottom:10px">'+inp(id,'password',ph)
    +'<button type="button" class="lg-eye" onclick="lgSuEye(\''+id+'\')" aria-label="Show password" title="Show password">'+EYE+'</button></div>';};
  const sel=function(id,opts,ph){return '<select class="lg-input" id="'+id+'">'+(ph?'<option value="">'+ph+'</option>':'')
    +opts.map(function(o){return '<option>'+o+'</option>';}).join('')+'</select>';};
  const chk=function(id,text){return '<label style="display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:13px;color:var(--gray,#6a7282);cursor:pointer">'
    +'<input type="checkbox" id="'+id+'"> '+text+'</label>';};
  /* The fields of the sign-up page (product owner, 16 Nov 2026): Organisation Name, Administrator's Full Name, Official
     Work Email (verified with a code), Password and Confirm Password, two acceptances (the Terms & Conditions; the
     Privacy Notice), both needed, and Create Account. */
  const tick=function(id,html){return '<label style="display:flex;align-items:flex-start;gap:8px;margin:0 0 10px;font-size:13px;line-height:1.5;color:var(--gray,#6a7282);cursor:pointer">'
    +'<input type="checkbox" id="'+id+'" style="margin-top:3px;flex:none"> <span>'+html+'</span></label>';};
  const doc=function(k,text){return '<a href="#" class="lg-link" style="font-size:13px" onclick="event.preventDefault();event.stopPropagation();lgSuDoc(\''+k+'\')">'+text+'</a>';};
  function formHTML(){
    return '<div style="margin-bottom:14px"><button type="button" class="lg-link" style="text-decoration:none" onclick="lgSuBack()">&larr; Back</button></div>'
      +'<h2 style="text-align:left">Create your account</h2>'
      +'<p class="lg-sub" style="text-align:left;margin-bottom:22px">Set up your organisation on ONC.</p>'
      +lbl('su-org','Organisation Name')+inp('su-org','text','Enter your organisation name')
      +lbl('su-name','Administrator&rsquo;s Full Name')+inp('su-name','text','Enter the administrator&rsquo;s full name')
      +lbl('su-email','Official Work Email')
      +'<div style="display:flex;gap:8px;align-items:flex-start">'
        +'<input class="lg-input" id="su-email" type="email" placeholder="name@company.com" autocomplete="off" style="flex:1;min-width:0">'
        +'<button type="button" class="lg-google" id="su-otp-get" style="flex:none;height:42px;padding:0 16px;border-radius:12px" onclick="lgSuOtp()">Verify</button>'
      +'</div>'
      +lbl('su-pass','Password')+pass('su-pass','Enter password')
      +lbl('su-pass2','Confirm Password')+pass('su-pass2','Re-enter password')
      +'<div style="margin:4px 0 18px">'
        +tick('su-tc','I agree to the OpenDhi ONC '+doc('terms','Terms &amp; Conditions')+' on behalf of my organisation and confirm that I am authorised to do so.')
        +tick('su-pn','I acknowledge that I have read the '+doc('privacy','Privacy Notice')+'.')
      +'</div>'
      +'<button type="button" class="lg-btn" onclick="lgSuGo()">Create Account</button>'
      +'<p class="lg-foot">Already have an account? <button type="button" class="lg-link" onclick="lgSuBack()">Sign in</button></p>';
  }
  /* The Terms & Conditions and the Privacy Notice open over the form to read; the wording is the company's to supply. */
  const DOCS={terms:['Terms &amp; Conditions',['These Terms &amp; Conditions govern your organisation&rsquo;s use of the ONC platform.',
      'By creating an account you confirm that you are authorised to act for your organisation, that the details you give are accurate, and that the people you invite will use the platform for your organisation&rsquo;s business only.',
      'Your organisation remains responsible for the activity under its account, for keeping sign-in details confidential, and for the requests and approvals its users make.',
      'The full Terms &amp; Conditions are shared with your organisation at onboarding.']],
    privacy:['Privacy Notice',['This Privacy Notice explains how ONC handles the information you provide.',
      'We use your organisation&rsquo;s name, the administrator&rsquo;s name and the official work email to create and secure the account, to verify the email address, and to contact you about the service.',
      'Information about your employees is used only to provide the services your organisation switches on, and is not sold or shared for advertising.',
      'The full Privacy Notice is shared with your organisation at onboarding.']]};
  window.lgSuDoc=function(k){
    const d=DOCS[k];if(!d)return;lgSuDocClose();
    const o=document.createElement('div');o.id='su-doc';
    o.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:24px';
    o.onclick=function(e){if(e.target===o)lgSuDocClose();};
    o.innerHTML='<div role="dialog" aria-modal="true" style="background:#fff;border-radius:16px;max-width:520px;width:100%;padding:26px 28px;box-shadow:0 20px 50px rgba(15,23,42,.25)">'
      +'<h3 style="margin:0 0 12px;font-size:18px;font-weight:600;color:var(--navy,#0f172a)">'+d[0]+'</h3>'
      +d[1].map(function(t){return '<p style="margin:0 0 10px;font-size:13.5px;line-height:1.6;color:var(--gray,#6a7282)">'+t+'</p>';}).join('')
      +'<div style="display:flex;justify-content:flex-end;margin-top:16px"><button type="button" class="lg-btn" style="width:auto;padding:0 22px;height:40px" onclick="lgSuDocClose()">Close</button></div></div>';
    document.body.appendChild(o);
  };
  window.lgSuDocClose=function(){const o=document.getElementById('su-doc');if(o)o.remove();};
  window.lgSignUp=function(){
    const c=card();if(!c)return;
    if(signInHTML==null)signInHTML=c.innerHTML;
    c.innerHTML=formHTML();c.setAttribute('onsubmit','event.preventDefault();');
    const v=document.getElementById('v-login');if(v)v.scrollTop=0;
  };
  window.lgSuBack=function(){
    const c=card();if(!c||signInHTML==null)return;
    c.innerHTML=signInHTML;c.setAttribute('onsubmit','event.preventDefault();lgSignIn();');
    const eye=document.getElementById('lg-eye');if(eye&&typeof LG_EYE_SHUT!=='undefined')eye.innerHTML=LG_EYE_SHUT;
  };
  window.lgSuEye=function(id){const e=document.getElementById(id);if(e)e.type=e.type==='password'?'text':'password';};
  window.lgSuOtp=function(){
    const m=(document.getElementById('su-email')||{}).value||'';
    showToast('Verification code sent','success',m.trim()?'A code was sent to '+m.trim()+'.':'A code was sent to your email.');
  };
  /* Whatever is entered: in as the OpenDhi Super Admin, in Dhi Hyperlocal. Nothing is created or kept. */
  window.lgSuGo=function(){
    const em=typeof presStartEmail==='function'?presStartEmail():'';
    const r=typeof idSignIn==='function'?idSignIn(em):{error:'Sign-in is not available.'};
    if(r&&r.error){showToast('Cannot sign up','error',r.error);return;}
    const dh=(typeof entitiesData!=='undefined'?entitiesData:[]).find(function(e){return /Dhi Hyperlocal/i.test(e.name);});
    if(dh){seSelectedEntity=dh.id;if(typeof appEntityChanged==='function')appEntityChanged();}
    lgSuBack();   // the next Sign Out shows the sign-in card again
    if(typeof lgEnter==='function')lgEnter();
    showToast('Welcome to ONC','success','You are in Dhi Hyperlocal as the Super Admin.');
  };
})();
