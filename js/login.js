/* ══ SIGN IN ═══════════════════════════════════════════════════════════════
   The first screen (#v-login in index.html). The email names the account
   (js/identity.js idSignIn): it must exist, be active and hold a role in an
   entity. That account is the person behind every action until Sign Out.
   Passwords are not checked in this front-end prototype; the field must still
   hold something.

   Signed in is remembered for the browser tab (sessionStorage), so a reload
   while working does not bounce back here; closing the tab, or Sign Out in the
   profile menu, does. */

const LG_KEY='adt-signed-in';
const LG_EYE_OPEN='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const LG_EYE_SHUT='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function lgTogglePass(){
  const inp=document.getElementById('lg-pass'),eye=document.getElementById('lg-eye');
  if(!inp||!eye)return;
  const show=inp.type==='password';
  inp.type=show?'text':'password';
  eye.innerHTML=show?LG_EYE_OPEN:LG_EYE_SHUT;
  eye.title=show?'Hide password':'Show password';
  eye.setAttribute('aria-label',eye.title);
}
function lgSoon(what){showToast(what+' is not available yet','info','Use the pre-filled details to sign in.');}

// Into the app, on the Dashboard, as the signed-in account.
function lgEnter(){
  try{sessionStorage.setItem(LG_KEY,'1');}catch(e){}
  if(typeof currentRole!=='undefined')currentRole='';
  if(typeof emsSyncIdentity==='function')emsSyncIdentity();
  page='dashboard';
  showView('adt');
  renderADTPage();
  if(typeof emsApplyChrome==='function')emsApplyChrome();
  if(typeof syncHeaderUser==='function')syncHeaderUser();
  if(typeof notifSyncBell==='function')notifSyncBell();
}
function lgSignIn(via){
  const email=document.getElementById('lg-email'),pass=document.getElementById('lg-pass');
  if(via!=='google'){
    const bad=function(el,msg){el.classList.add('is-bad');el.focus();showToast(msg,'error');setTimeout(function(){el.classList.remove('is-bad');},1600);};
    if(!email.value.trim())return bad(email,'Enter your email address');
    if(!pass.value)return bad(pass,'Enter your password');
  }
  const res=idSignIn(email.value);
  if(res.error){email.classList.add('is-bad');email.focus();showToast('Cannot sign in','error',res.error);setTimeout(function(){email.classList.remove('is-bad');},1600);return;}
  const btn=document.getElementById('lg-submit');
  if(btn){btn.disabled=true;btn.textContent='Signing in…';}
  // A beat on the button, so the hand-over reads as a sign-in and not a cut.
  setTimeout(function(){
    if(btn){btn.disabled=false;btn.textContent='Sign in';}
    lgEnter();
  },450);
}
function lgSignOut(){
  try{sessionStorage.removeItem(LG_KEY);}catch(e){}
  idSignOut();
  if(typeof currentRole!=='undefined')currentRole='';
  showView('login');
  const pass=document.getElementById('lg-pass');if(pass&&pass.type!=='password')lgTogglePass();
}

// On load: the eye icon, and straight in if this tab is already signed in.
(function(){
  const eye=document.getElementById('lg-eye');if(eye)eye.innerHTML=LG_EYE_SHUT;
  /* No sign-in step: the app opens straight in, as the account last used in
     this tab or the pre-filled one. Roles are switched from the header
     (Switch Role); this screen is shown only after Sign Out. */
  let signed=true;
  if(!idMe()){const em=document.getElementById('lg-email');signed=!idSignIn(em?em.value:'').error;}
  /* The page was first drawn before anyone was signed in (renderer.js): draw
     it again, with the menu, header and bell, as the signed-in person. */
  if(signed)lgEnter();else view='login';
})();
