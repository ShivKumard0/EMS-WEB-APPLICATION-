/* ══ EMPLOYEE DASHBOARD: ANNOUNCEMENTS ════════════════════════════════════
   What HR and the employee's manager have posted, under Key Metrics: an
   "Announcements" band, then a Latest Updates panel built like every other
   dashboard section (.hr-section).

   Two states, and the empty one is designed, not left blank. An employee who
   opens the dashboard to an empty box cannot tell "nothing has been posted"
   from "this failed to load". So the empty panel says, in words and with its
   own small piece of art, that they are caught up and where updates will
   come from.

   The data is empAnnouncements (js/core.js, beside the other dashboard
   fixtures). Every string in a post came from a person typing it, so all of
   it goes through sbEsc before it reaches the page.

   Mounted by renderADTPage on every visit to the dashboard, the same way
   empDashRender fills the lifecycle tracker: the dashboard is re-injected
   from a snapshot, so the panel has to be drawn again each time. */

const ANN_ICO={
  megaphone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.2v3.6a1 1 0 0 0 .8 1L15 17.5V6.5L3.8 9.2a1 1 0 0 0-.8 1z"/><path d="M6.5 14.9v2.6a2 2 0 0 0 4 0v-1.6"/><path d="M18 9.5a4 4 0 0 1 0 5"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
};
const ANN_ROLE={hr:'HR',manager:'Manager'};

/* "2 hours ago", "Yesterday", "3 days ago", "1 week ago" - and a date once a
   post is older than a month, when a count of weeks stops meaning anything. */
function annAgo(iso){
  const t=Date.parse(iso);if(isNaN(t))return '';
  const mins=Math.max(0,Math.round((Date.now()-t)/60000));
  if(mins<1)return 'Just now';
  if(mins<60)return mins+' min'+(mins===1?'':'s')+' ago';
  const hrs=Math.floor(mins/60);
  if(hrs<24)return hrs+' hour'+(hrs===1?'':'s')+' ago';
  const days=Math.floor(hrs/24);
  if(days===1)return 'Yesterday';
  if(days<7)return days+' days ago';
  if(days<31){const w=Math.floor(days/7);return w+' week'+(w===1?'':'s')+' ago';}
  return cdLabel(iso.slice(0,10));
}
/* A soft tint per person, worked out from the name - nobody assigns or keeps
   track of colours. The same name always lands on the same tint, so a poster
   is recognisable at a glance on the card and in the drawer alike. Six muted
   tints, all light, so the avatars stay quiet next to the status colours. */
const ANN_TONES=6;
function annTone(name){
  let h=0;String(name||'').split('').forEach(function(c){h=(h*31+c.charCodeAt(0))>>>0;});
  return h%ANN_TONES;
}
function annInitials(name){
  return String(name||'').trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('').toUpperCase();
}
/* The profile menu's announcements switch (js/dash-preview.js). Off shows the
   empty state, so both states can be demoed without editing empAnnouncements. */
let annShow=true;
/* Swap the panel's contents with a short hand-off rather than a cut: the old
   body lifts out, the new one rises in and its rows arrive one after another.
   Only the body changes - the card and its header stay put. */
function annSwap(){
  const panel=document.querySelector('#emp-ann-dash .ann-panel');
  if(!panel){annRender();return;}
  const old=panel.querySelector('.ann-scroll');
  if(old)old.classList.add('is-out');
  setTimeout(function(){
    annRender();
    const fresh=document.querySelector('#emp-ann-dash .ann-scroll');
    if(fresh)fresh.classList.add('is-in');
    const count=document.querySelector('#emp-ann-dash .ann-count');
    if(count)count.classList.add('is-pop');
  },170);
}
function annSorted(){
  if(!annShow)return [];
  // Pinned first (FR-05.5), then newest. What is in the list at all — Active,
  // inside its validity window, for this reader — is decided by anmSync().
  return (typeof empAnnouncements!=='undefined'?empAnnouncements:[]).slice()
    .sort(function(a,b){return (b.pinned?1:0)-(a.pinned?1:0)||(Date.parse(b.when)||0)-(Date.parse(a.when)||0);});
}

/* The card shows the newest few, each on two lines: the title, then who
   said it and when. The text itself is read in the drawer. Clicking one opens the
   reading drawer at that post; "View all" opens it at the top.

   NO COLOUR PER PERSON. Every avatar is the same neutral chip; who someone is
   is said in words ("Priya Sharma · HR"), not by a hue a reader has to learn
   and that runs out as soon as there are more posters than colours. Colour is
   left for the two things that are states: a blue dot for New, a pin for
   Pinned. */
const ANN_VISIBLE=3;
const ANN_PIN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></svg>';
const ANN_ARROW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
/* A post's id is its place in empAnnouncements, which does not move when the
   list is sorted or filtered. */
function annId(a){return empAnnouncements.indexOf(a);}
function annMarks(a){
  return (a.pinned?'<span class="ann-pin" title="Pinned" aria-label="Pinned">'+ANN_PIN+'</span>':'');
}
function annListHTML(list){
  return '<ul class="ann-list">'+list.slice(0,ANN_VISIBLE).map(function(a){
    const from=a.from==='manager'?'manager':'hr';
    return '<li><button type="button" class="ann-row" onclick="annOpen('+annId(a)+')">'
      +'<span class="ann-av tone-'+annTone(a.author)+'" aria-hidden="true">'+sbEsc(annInitials(a.author))+'</span>'
      +'<span class="ann-body">'
        +'<span class="ann-head">'+annMarks(a)+'<span class="ann-title">'+sbEsc(a.title)+'</span></span>'
        +'<span class="ann-meta"><b>'+sbEsc(a.author)+'</b><span>'+ANN_ROLE[from]+'</span>'
          +'<span class="ann-dot" aria-hidden="true"></span><time datetime="'+sbEsc(a.when)+'">'+annAgo(a.when)+'</time></span>'
      +'</span>'
      +'<span class="ann-go" aria-hidden="true">'+ANN_ARROW+'</span>'
    +'</button></li>';
  }).join('')+'</ul>';
}

/* The caught-up state. The art is layered: a dashed outer ring, a solid inner
   ring, a raised disc carrying the megaphone, two sound waves leaving it, a
   check badge, and four dots drifting around - all decoration, so all of it is
   aria-hidden and the words carry the message. */
function annEmptyHTML(){
  return '<div class="ann-empty" role="status">'
    +'<div class="ann-art" aria-hidden="true">'
      +'<span class="ann-ring-out"></span><span class="ann-ring-in"></span>'
      +'<span class="ann-wave"></span><span class="ann-wave is-late"></span>'
      +'<span class="ann-disc"><span class="ann-mega">'+ANN_ICO.megaphone+'</span></span>'
      +'<span class="ann-badge">'+ANN_ICO.check+'</span>'
      +'<span class="ann-fx is-amber"></span><span class="ann-fx is-blue"></span>'
      +'<span class="ann-fx is-violet"></span><span class="ann-fx is-ring"></span>'
    +'</div>'
    +'<div class="ann-empty-title">You’re all caught up</div>'
    +'<p class="ann-empty-sub">There are no announcements right now. When HR or your manager shares an update, it will show up here first.</p>'
    +'<div class="ann-empty-chips"><span class="ann-chip is-hr">HR updates</span><span class="ann-chip is-manager">Manager notes</span></div>'
  +'</div>';
}

/* The panel sits in the Overview grid, left of Attendance: header, the
   newest few posts, and a footer link to all of them. */
function announcementsHTML(){
  const list=annSorted();
  return '<div class="hr-section ann-panel">'
      +'<div class="hr-section-header">'
        +'<div class="hr-section-title"><span class="ann-head-ico" aria-hidden="true">'+ANN_ICO.megaphone+'</span>Announcements'
          +(list.length?'<span class="ann-count">'+list.length+'</span>':'')+'</div>'
        +'<span class="ann-from">From HR &amp; your manager</span>'
      +'</div>'
      +'<div class="ann-scroll">'+(list.length?annListHTML(list):annEmptyHTML())+'</div>'
      +(list.length?'<button type="button" class="ann-all" onclick="annOpen()">View all announcements'
        +(list.length>ANN_VISIBLE?'<span class="ann-all-more">+'+(list.length-ANN_VISIBLE)+' more</span>':'')
        +ANN_ARROW+'</button>':'')
    +'</div>';
}
function annRender(root){
  /* Re-read from Governance → Announcements on every paint, so a post that
     has reached its Valid From (or passed its Valid To) appears or goes. */
  if(typeof anmSync==='function')anmSync();
  const scope=root||document;
  const host=scope.querySelector?scope.querySelector('#emp-ann-dash'):null;
  if(host)host.innerHTML=announcementsHTML();
  /* The Overview band is dated, so it reads as "today" whether or not the
     lifecycle tracker is above it. */
  const today=scope.querySelector?scope.querySelector('#emp-today'):null;
  if(today)today.textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

/* ══ THE READING DRAWER ═══════════════════════════════════════════════════
   Every announcement in full, pinned first then newest, filterable by who
   posted it. Opened at a post, that post is scrolled to and briefly
   highlighted. */
let annFilter='all';
let annFocus=null;
function annOpen(id){
  annFocus=(id==null)?null:id;
  annFilter='all';
  let ov=document.getElementById('ann-ov');
  if(!ov){
    ov=document.createElement('div');ov.id='ann-ov';ov.className='ann-ov';
    ov.innerHTML='<div class="ann-ov-bg" onclick="annClose()"></div>'
      +'<aside class="ann-drawer" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="ann-dr-title"></aside>';
    document.body.appendChild(ov);
  }
  ov.classList.remove('is-closing');
  annDrawerPaint();
  annRender();
  const focus=ov.querySelector('.ann-card.is-focus');
  if(focus)requestAnimationFrame(function(){focus.scrollIntoView({block:'center'});});
  /* Focus moves into the drawer for keyboard and screen-reader users, onto the
     drawer itself so no control lights up with a focus ring on open. */
  const dr=ov.querySelector('.ann-drawer');if(dr)dr.focus({preventScroll:true});
}
function annClose(){
  const ov=document.getElementById('ann-ov');if(!ov||ov.classList.contains('is-closing'))return;
  ov.classList.add('is-closing');
  setTimeout(function(){ov.remove();},240);
}
function annSetFilter(f){
  annFilter=f;annFocus=null;
  annDrawerPaint();
}
function annFromKey(a){return a.from==='manager'?'manager':'hr';}
function annDrawerPaint(){
  const dr=document.querySelector('#ann-ov .ann-drawer');if(!dr)return;
  const all=annSorted();
  const pick=function(f){return all.filter(function(a){return f==='all'||annFromKey(a)===f;});};
  const list=pick(annFilter).sort(function(a,b){return (b.pinned?1:0)-(a.pinned?1:0);});
  const tab=function(f,l){return '<button type="button" role="tab" aria-selected="'+(annFilter===f)+'" class="ann-tab'+(annFilter===f?' is-on':'')+'" onclick="annSetFilter(\''+f+'\')">'+l+'<span>'+pick(f).length+'</span></button>';};
  dr.innerHTML='<header class="ann-dr-head">'
      +'<span class="ann-dr-ico" aria-hidden="true">'+ANN_ICO.megaphone+'</span>'
      +'<div class="ann-dr-titles"><h2 id="ann-dr-title">Announcements</h2><p>Updates from HR and your manager</p></div>'
      +'<button type="button" class="ann-dr-close" onclick="annClose()" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
    +'</header>'
    +'<div class="ann-tabs" role="tablist">'+tab('all','All')+tab('hr','HR')+tab('manager','Manager')+'</div>'
    +'<div class="ann-dr-body">'+(list.length?list.map(annCardHTML).join(''):'<p class="ann-dr-none">Nothing from this sender yet.</p>')+'</div>';
}
function annCardHTML(a,i){
  const id=annId(a);
  const d=new Date(a.when);
  const full=isNaN(d)?'':d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})+', '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  return '<article class="ann-card'+(id===annFocus?' is-focus':'')+(a.pinned?' is-pinned':'')+'" style="animation-delay:'+Math.min(i,6)*45+'ms">'
    +'<div class="ann-card-top">'
      +'<span class="ann-av tone-'+annTone(a.author)+'" aria-hidden="true">'+sbEsc(annInitials(a.author))+'</span>'
      +'<div class="ann-card-who"><b>'+sbEsc(a.author)+'</b><span>'+ANN_ROLE[annFromKey(a)]+'</span></div>'
      +'<time class="ann-card-when" datetime="'+sbEsc(a.when)+'">'+annAgo(a.when)+'</time>'
    +'</div>'
    +'<h3 class="ann-card-title">'+annMarks(a)+'<span>'+sbEsc(a.title)+'</span></h3>'
    +'<p class="ann-card-text">'+sbEsc(a.text)+'</p>'
    +'<div class="ann-card-foot">'
      +(a.pinned?'<span class="ann-tag is-pinned">Pinned</span>':'')
      +(a.category?'<span class="ann-tag">'+sbEsc(a.category)+'</span>':'')
      +'<span class="ann-card-date">'+sbEsc(full)+'</span>'
    +'</div>'
  +'</article>';
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('ann-ov'))annClose();});
