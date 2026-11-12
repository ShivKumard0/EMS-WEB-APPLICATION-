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
  function formHTML(){
    return '<div style="margin-bottom:14px"><button type="button" class="lg-link" style="text-decoration:none" onclick="lgSuBack()">&larr; Back</button></div>'
      +'<h2 style="text-align:left">Welcome to Bhaiyaa!</h2>'
      +'<p class="lg-sub" style="text-align:left;margin-bottom:22px">Create your account to get started.</p>'
      +lbl('su-mobile','Mobile Number')
      +'<div style="display:flex;gap:8px;align-items:flex-start">'
        +'<select class="lg-input" id="su-dial" style="width:96px;flex:none;padding:0 8px"><option>IN(+91)</option><option>AE(+971)</option><option>SG(+65)</option><option>UK(+44)</option><option>US(+1)</option></select>'
        +'<input class="lg-input" id="su-mobile" type="tel" placeholder="Mobile Number" autocomplete="off" style="flex:1;min-width:0">'
        +'<button type="button" class="lg-google" style="flex:none;height:42px;padding:0 14px;border-radius:12px" onclick="lgSuOtp()">Get OTP</button>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +'<div>'+lbl('su-fname','First Name')+inp('su-fname','text','Enter Your First Name')+'</div>'
        +'<div>'+lbl('su-lname','Last Name')+inp('su-lname','text','Enter Your Last Name')+'</div>'
      +'</div>'
      +lbl('su-email','Email ID')+inp('su-email','email','Enter Your Email Address')
      +lbl('su-pass','Password')+pass('su-pass','Enter Password')
      +lbl('su-pass2','Re-Enter Password')+pass('su-pass2','Re-Enter Password')
      +lbl('su-store','Enter Your Store Name')+inp('su-store','text','Store Name')
      +lbl('su-cat','Choose Store Category')+sel('su-cat',CATS,'Select Store Category')
      +lbl('su-country','Country')+sel('su-country',COUNTRIES,'Select Country')
      +'<div style="margin:4px 0 18px">'
        +chk('su-tc','I accept the <span class="lg-link" style="font-size:13px">Terms &amp; Conditions</span>')
        +chk('su-msa','I accept the <span class="lg-link" style="font-size:13px">MSA</span>')
      +'</div>'
      +'<button type="button" class="lg-btn" onclick="lgSuGo()">Sign up</button>'
      +'<p class="lg-foot">Already have an account? <button type="button" class="lg-link" onclick="lgSuBack()">Sign in</button></p>';
  }
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
    const m=(document.getElementById('su-mobile')||{}).value||'';
    showToast('OTP sent','success',m.trim()?'A code was sent to '+(document.getElementById('su-dial')||{}).value.replace(/^\w+/,'')+' '+m.trim()+'.':'A code was sent to your mobile number.');
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
    showToast('Welcome to Bhaiyaa','success','You are in Dhi Hyperlocal as the Super Admin.');
  };
})();
