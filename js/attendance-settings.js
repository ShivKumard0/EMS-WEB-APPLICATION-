/* ══ COMPANY SETTINGS → ATTENDANCE ═════════════════════════════════════════
   Six things decide how attendance behaves for an entity, and each one is a
   section here: working hours, grace, freeze, week-off requests, the
   absconding flow, and the geofence a punch has to land inside.

   THE SECTION IS THE UNIT, AND ITS HEADER CARRIES ITS STATE. Three of the six
   are features that can be switched off entirely, and the switch belongs in
   the section's own header rather than as the first row of its body — the
   header then answers "is this on?" before you have read a single field, and
   the body is free to be nothing but the settings that the switch governs. A
   section that is off dims its body instead of emptying it, so the numbers you
   set last month are still legible while the feature sleeps.

   VIEW FIRST, THEN EDIT. Every other tab in this panel is read-only behind an
   Edit button, so this one is too. Edit swaps the same six sections to
   controls and puts Cancel / Save under them; Cancel restores from the saved
   record, so an abandoned edit leaves nothing behind. The draft lives in JS,
   not in the inputs — isbTab() replaces the whole panel body on every repaint,
   and anything held only in the DOM would go with it.

   LATITUDE AND LONGITUDE ARE NOT TYPED. They are read off the map: drag to
   pan, click to drop the pin, and the two read-outs under the map follow it.
   Hand-keyed coordinates are the single easiest way to put an office in the
   sea, and there is nothing a person can do with a decimal degree that they
   could not do better by looking at where the pin is. See THE MAP below. */

// ── THE RECORD ──
const CSA_DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const CSA_APPROVERS=['Manager','Reporting Manager','HR','Entity Admin'];
/* FR-01.7 — OVERTIME ALLOWED = NO: WORK HOURS CAPPING RULE.
   On the entities below, an entity that does not allow overtime says how a
   long day is cut back:
     Cap at Configured Work End Time — hours stop counting at the shift's End Time
     Cap at Maximum Daily Hours      — hours stop counting at Daily Work Hours
   Matched by name against the entity in the top bar (hdCurrentEntityName). */
const CSA_OT_CAPS=['Cap at Configured Work End Time','Cap at Maximum Daily Hours'];
const CSA_OT_CAP_ENTITIES=['opendhi','dhi hyperlocal'];
function csAttCapApplies(){
  const n=(typeof hdCurrentEntityName==='function'?hdCurrentEntityName():'').trim().toLowerCase();
  return CSA_OT_CAP_ENTITIES.indexOf(n)>=0;
}
const CSA_ABSENCE_ACTIONS=[
  'Notify HR & Mark Employee as Absconding',
  'Notify HR & Reporting Manager',
  'Notify HR Only',
  'Mark Employee as Absconding'
];
/* The places this app already knows about — the office the timesheet puts its
   punches at (TS_PLACES.Hyderabad) and the branch on the Company Structure
   tab. They are here so that "set the address" can be one click on a real
   address rather than a paragraph of typing; the list is deliberately short,
   because inventing plausible offices would put addresses in the product that
   belong to nobody. */
const CSA_PLACES=[
  {name:'Dhi Hyperlocal — HITEC City',
   address:'Dhi Hyperlocal, HITEC City, Madhapur, Hyderabad 500081, India',
   lat:17.4435,lng:78.3772},
  {name:'Hyderabad Branch — My Home Bhooja',
   address:'My Home Bhooja, Dallas Centre Rd, Silpa Gram Craft Village, Rai Durg, Hyderabad 500032, India',
   lat:17.4256,lng:78.3823}
];
/* QR: the employee marks attendance by scanning the entity's QR code. */
const CSA_MODES=['Auto','Manual','Hybrid','QR'];
const CSA_SHIFTS=['Fixed','Flexible','Rotational'];
let csAtt={
  /* The six the tab has always shown. They are kept because they answer
     questions the newer settings do not: HOW a day is captured, and what shape
     of day it is. Daily Work Hours is not the shift window either — the window
     is 09:00–18:00 and the expected day is eight, the difference being the
     break — so the two are separate fields rather than one derived from the
     other. */
  mode:'Auto',
  dailyHours:8,
  shiftType:'Fixed',
  overtimeAllowed:false,
  otCapRule:'Cap at Configured Work End Time',   // used when overtimeAllowed is false (FR-01.7)
  latePolicy:30,
  /* With geolocation on, a clock-in is accepted only inside one of the
     Attendance Locations' radius — there is no separate switch for that.
     Outside it, the punch becomes a manual entry request for approval
     (attendance-request.js). With it off, nobody is asked for a location. */
  geolocation:true,
  startTime:'09:00',
  endTime:'18:00',
  workingDays:['Mon','Tue','Wed','Thu','Fri'],
  weekOffDays:['Sat','Sun'],
  clockInGrace:15,
  clockOutGrace:15,
  freezeEnabled:true,
  freezeDays:3,
  weekOffRequest:true,
  weekOffApprover:'Manager',
  abscondEnabled:true,
  abscondDays:3,
  abscondAction:'Notify HR & Mark Employee as Absconding',
  /* ONE LIST, TWO SCREENS. These are the entity's branches — Company
     Structure → Branch lists and adds them — and the same records are the
     offices a clock-in is measured against here. Keeping one list is what
     lets the radius be set in either place and read the same in both. Only
     Active ones fence a punch. */
  locations:CSA_PLACES.map(function(p){
    return {name:p.name,address:p.address,lat:p.lat,lng:p.lng,radius:100,status:'Active'};
  })
};
let csAttEdit=false;     // true while the tab is showing controls
let csAttDraft=null;     // the edit in progress; null unless csAttEdit
let csAttDirty=false;

function csAttClone(o){return JSON.parse(JSON.stringify(o));}
/* ONE SET PER ENTITY. csAtt is the active entity's settings and branches;
   switching entity files them away and brings that entity's out. The
   shipped set belongs to the first entity; another entity starts from the
   same rule defaults with no branches of its own. */
const CS_ATT_DEFAULTS=Object.assign(csAttClone(csAtt),{locations:[]});
const csAttBook={};
let csAttEnt='';
function csAttForEntity(){
  if(typeof idEntity!=='function')return;
  const ent=idEntity();
  if(!csAttEnt)csAttEnt=typeof ID_HOME_ENTITY!=='undefined'?ID_HOME_ENTITY:ent;
  if(csAttEnt===ent)return;
  csAttBook[csAttEnt]=csAtt;
  csAtt=csAttBook[ent]||(csAttBook[ent]=csAttClone(CS_ATT_DEFAULTS));
  csAttEnt=ent;csAttEdit=false;csAttDraft=null;csAttDirty=false;
}
function csAttModel(){return csAttEdit&&csAttDraft?csAttDraft:csAtt;}
function csAttInt(v,fallback){
  const n=parseInt(v,10);
  return isNaN(n)?fallback:Math.max(0,n);
}
function csAttNum(v,fallback){
  const n=parseFloat(v);
  return isNaN(n)?fallback:n;
}
// Native <input type="time"> speaks 24h; people read the clock the way the
// timesheet already prints it, so the view mode converts and the edit mode
// does not.
function csAttTime12(t){
  const m=/^(\d{1,2}):(\d{2})$/.exec(String(t||'').trim());
  if(!m)return '—';
  let h=+m[1];
  const ap=h>=12?'PM':'AM';
  h=h%12||12;
  return h+':'+m[2]+' '+ap;
}
function csAttList(a){return (a&&a.length)?a.join(', '):'—';}

/* ══ apMS — MULTI-SELECT ═══════════════════════════════════════════════════
   The third member of the apCS / apCD family, and deliberately the same
   object: identical trigger geometry, identical dropdown shell, identical
   tick. Only two things differ, and both follow from picking MORE THAN ONE:
   the option list stays open while you choose, and the trigger summarises what
   is chosen with a clear-all beside it.

   IT IS FIXED-POSITIONED, like apCD and for the same reason. These fields sit
   inside .lp-isb-body, which is overflow:auto — an absolutely-positioned panel
   is clipped by it. placeAnchoredMenu() measures and places it.

   SELECTION LIVES IN apMSState, not in the markup, because the panel body is
   replaced wholesale on every repaint. */
const apMSState={};
function apMS(id,opts,selected,placeholder,hook){
  // hook: name of a function told (with the id) when the selection changes.
  apMSState[id]={opts:opts.slice(),sel:(selected||[]).slice(),ph:placeholder||'Select',hook:hook||''};
  /* The summary and the empty class are written INTO the markup, not painted
     on afterwards: the control has to be readable the instant the panel body
     is swapped in, and there is no mount hook to paint it from. */
  return '<div class="ms-wrap" id="msw-'+id+'">'
    +'<button type="button" class="ms-trigger'+(apMSState[id].sel.length?'':' ms-empty')
      +'" data-msid="'+id+'" onclick="msToggle(this)">'
      +'<span class="ms-value" id="msv-'+id+'">'+msValueHTML(id)+'</span>'
      +'<span class="ms-tools">'
        +'<span class="ms-clear" role="button" tabindex="0" title="Clear all" '
          +'onclick="msClear(event,\''+id+'\')" onkeydown="msClearKey(event,\''+id+'\')">'
          +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
        +'</span>'
        +'<svg class="ms-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
      +'</span>'
    +'</button>'
    +'<div class="ms-dropdown" id="msd-'+id+'"></div>'
  +'</div>';
}
function getMSValue(id){const s=apMSState[id];return s?s.sel.slice():[];}
function msValueHTML(id){
  const s=apMSState[id];
  if(!s)return '';
  if(!s.sel.length)return '<span class="ms-placeholder">'+attrSafe(s.ph)+'</span>';
  // Kept in the order the options were declared, so Mon…Sun always reads
  // Mon…Sun however it was clicked together.
  return s.opts.filter(function(o){return s.sel.indexOf(o)>=0;}).map(attrSafe).join(', ');
}
function msOptionsHTML(id){
  const s=apMSState[id];
  if(!s)return '';
  return s.opts.map(function(o){
    const on=s.sel.indexOf(o)>=0;
    return '<div class="cs-option'+(on?' cs-selected':'')+'" role="option" aria-selected="'+on+'" '
      +'onclick="msPick(\''+id+'\',\''+attrSafe(o)+'\')"><span>'+attrSafe(o)+'</span>'
      +'<svg class="cs-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
    +'</div>';
  }).join('');
}
function msPaint(id){
  const v=document.getElementById('msv-'+id);
  if(v)v.innerHTML=msValueHTML(id);
  const d=document.getElementById('msd-'+id);
  if(d)d.innerHTML=msOptionsHTML(id);
  const w=document.getElementById('msw-'+id);
  const t=w?w.querySelector('.ms-trigger'):null;
  if(t)t.classList.toggle('ms-empty',!(apMSState[id]&&apMSState[id].sel.length));
}
function msPick(id,val){
  const s=apMSState[id];
  if(!s)return;
  const i=s.sel.indexOf(val);
  if(i>=0)s.sel.splice(i,1);else s.sel.push(val);
  msPaint(id);
  // The list stays open: picking five days should be five clicks, not five
  // round trips through the trigger.
  const d=document.getElementById('msd-'+id);
  const t=document.querySelector('[data-msid="'+id+'"]');
  if(d&&t&&d.classList.contains('ms-open'))placeAnchoredMenu(d,t.getBoundingClientRect(),{alignLeft:true,width:t.offsetWidth});
  msChanged(id);
}
// A control given a hook reports to it; the attendance form's own do as before.
function msChanged(id){
  const h=apMSState[id]&&apMSState[id].hook;
  if(h&&typeof window[h]==='function')window[h](id);else csAttOnChange();
}
function msClear(ev,id){
  if(ev){ev.stopPropagation();ev.preventDefault();}
  const s=apMSState[id];
  if(!s)return;
  s.sel=[];
  msPaint(id);
  msCloseAll();
  msChanged(id);
}
function msClearKey(ev,id){
  if(ev.key!=='Enter'&&ev.key!==' ')return;
  msClear(ev,id);
}
function msToggle(btn){
  const id=btn.dataset.msid;
  const d=document.getElementById('msd-'+id);
  if(!d)return;
  const wasOpen=d.classList.contains('ms-open');
  msCloseAll();
  if(wasOpen)return;                    // clicking the open trigger closes it
  d.innerHTML=msOptionsHTML(id);
  d.classList.add('ms-open');
  btn.classList.add('ms-open');
  placeAnchoredMenu(d,btn.getBoundingClientRect(),{alignLeft:true,width:btn.offsetWidth});
}
function msCloseAll(){
  document.querySelectorAll('.ms-dropdown.ms-open').forEach(function(d){d.classList.remove('ms-open');});
  document.querySelectorAll('.ms-trigger.ms-open').forEach(function(t){t.classList.remove('ms-open');});
}
document.addEventListener('click',function(e){
  if(!e.target.closest('.ms-wrap'))msCloseAll();
},true);   // capture: popups stop clicks bubbling
// A fixed panel does not travel with its trigger, so a scroll underneath would
// strand it — the same capture-phase listener apCD uses, for the same reason.
document.addEventListener('scroll',function(e){
  const open=document.querySelector('.ms-dropdown.ms-open');
  if(!open)return;
  if(e.target&&e.target.nodeType===1&&open.contains(e.target))return;
  msCloseAll();
},true);
window.addEventListener('resize',msCloseAll);

/* ══ THE MAP ═══════════════════════════════════════════════════════════════
   Drawn, not fetched — the app has no tile key and the timesheet's punch map
   already established that a map here is a picture we render ourselves. What
   this one adds is that IT IS A REAL PROJECTION rather than a decorative
   backdrop: every road, block and park is positioned in metres from a world
   origin and projected through the current centre and scale, so panning slides
   the city past, zooming reveals a finer street grid, and the pin's latitude
   and longitude are genuinely derived from where it sits on screen.

   THAT IS WHAT MAKES THE COORDINATES TRUSTWORTHY. csaToLatLng() is the exact
   inverse of csaProject(), so clicking a spot and reading the numbers back
   round-trips; the fields underneath are outputs, and there is nothing to type
   into them.

   The geography is invented but STABLE AND PLACE-SPECIFIC: every feature is
   seeded by its own world-grid index, so a block does not shuffle when you pan
   away and back, and two different offices do not get the same street layout.

   WHAT IT IS NOT is a geocoder. It cannot turn a pin into a street address, so
   the address stays a field a person fills in — or picks from CSA_PLACES,
   which are the two real addresses this app already holds. Auto-filling it
   with a plausible-looking invention would be worse than leaving it blank. */
const CSA_MAP_W=360,CSA_MAP_H=250;
const CSA_M_PER_DEG=111320;
let csaViews={};                 // per-location {cLat,cLng,mpp,userZoom}
function csaResetViews(){csaViews={};}
/* The map serves two forms: the Attendance tab's location cards (index 0..n)
   and the Company Structure → Add / Edit Branch form, which edits one branch
   at a time and is addressed as CSA_BR. Every map helper asks csaLoc() for
   its record, so neither form needs its own copy of the map. */
const CSA_BR=-1;
function csaLoc(i){
  return i===CSA_BR?csBrDraft:(csAttModel().locations||[])[i];
}
function csaChanged(i){
  if(i===CSA_BR)csBrOnChange();else csAttOnChange();
}
function csaView(i){
  if(!csaViews[i]){
    const loc=csaLoc(i)||{};
    const lat=csAttNum(loc.lat,CSA_PLACES[0].lat),lng=csAttNum(loc.lng,CSA_PLACES[0].lng);
    csaViews[i]={cLat:lat,cLng:lng,mpp:csaFitMpp(loc.radius),userZoom:false};
  }
  return csaViews[i];
}
// A scale at which the fence fills a comfortable share of the frame — about a
// third of its height — so a 50 m radius and a 2 km one are both readable.
function csaFitMpp(radius){
  return Math.max(0.15,(csAttInt(radius,100)||100)/72);
}
function csaLngScale(lat){return CSA_M_PER_DEG*Math.cos(lat*Math.PI/180);}
function csaProject(v,lat,lng){
  return {
    x:CSA_MAP_W/2+((lng-v.cLng)*csaLngScale(v.cLat))/v.mpp,
    y:CSA_MAP_H/2-((lat-v.cLat)*CSA_M_PER_DEG)/v.mpp
  };
}
function csaToLatLng(v,x,y){
  return {
    lat:v.cLat+((CSA_MAP_H/2-y)*v.mpp)/CSA_M_PER_DEG,
    lng:v.cLng+((x-CSA_MAP_W/2)*v.mpp)/csaLngScale(v.cLat)
  };
}
/* Deterministic 0..1 from a pair of integers — the same block always gets the
   same buildings, however many times you pan over it.

   THE FINAL MIX IS NOT OPTIONAL. FNV-1a alone left neighbouring cells
   correlated: two keys differing only in their last character come out of the
   loop about 2^24 apart, which is a hair's width in the top bits, so a column
   of adjacent blocks all landed in the same narrow band and the map grew a
   tidy vertical row of identical lakes. The murmur3 finaliser below is what
   turns "different input" into "unrelated output", and it is the difference
   between a city and a wallpaper pattern. */
function csaHash(a,b){
  let h=2166136261;
  const s=a+':'+b;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  h^=h>>>15;h=Math.imul(h,2246822507)>>>0;
  h^=h>>>13;h=Math.imul(h,3266489909)>>>0;
  h^=h>>>16;
  return (h>>>0)/4294967296;
}
// Blocks stay roughly a thumb across whatever the zoom, which is what makes
// zooming in reveal a finer grid instead of just enlarging the same one.
function csaBlockSize(mpp){
  const ladder=[10,20,40,80,160,320,640,1280,2560,5120];
  for(let i=0;i<ladder.length;i++)if(ladder[i]/mpp>=46)return ladder[i];
  return ladder[ladder.length-1];
}
const CSA_STREETS=['Ring Road','Cyber Avenue','MG Road','Park Street','Lake Road',
  'Hill Avenue','Station Road','Garden Avenue','Mint Street','Grand Trunk Road'];

function csaMapInner(loc,i){
  const v=csaView(i);
  const B=csaBlockSize(v.mpp),px=B/v.mpp;
  const eC=v.cLng*csaLngScale(v.cLat), nC=v.cLat*CSA_M_PER_DEG;   // centre, in metres
  // Which world-grid lines fall inside the frame, with a block of bleed so
  // nothing pops in at the edge.
  const i0=Math.floor((eC-CSA_MAP_W/2*v.mpp)/B)-1, i1=Math.ceil((eC+CSA_MAP_W/2*v.mpp)/B)+1;
  const j0=Math.floor((nC-CSA_MAP_H/2*v.mpp)/B)-1, j1=Math.ceil((nC+CSA_MAP_H/2*v.mpp)/B)+1;
  const sx=function(ix){return CSA_MAP_W/2+(ix*B-eC)/v.mpp;};
  const sy=function(jy){return CSA_MAP_H/2-(jy*B-nC)/v.mpp;};

  let land='',blocks='',casing='',fill='',labels='';
  land='<rect width="'+CSA_MAP_W+'" height="'+CSA_MAP_H+'" fill="#edeae2"/>';

  /* ── Blocks: parks, water and buildings, one decision per cell ──
     THE VARIATION IS THE POINT. A first pass packed every block with
     equal-sized footprints on a fixed sub-grid, and the result read as
     wallpaper: perfectly regular beige squares are the one thing no city has.
     So the sub-grid decides only roughly WHERE a building sits — how many
     there are, how much of their cell each one fills and where inside it they
     sit are all separate draws, and a fifth of them are dropped outright for
     the yards, lanes and car parks that break a real block up. */
  for(let ix=i0;ix<i1;ix++){
    for(let jy=j0;jy<j1;jy++){
      const x=sx(ix),y=sy(jy+1),w=px,h=px;         // jy+1 because y grows downward
      if(x>CSA_MAP_W||y>CSA_MAP_H||x+w<0||y+h<0)continue;
      const k=csaHash(ix,jy), inset=Math.max(1.5,px*0.09);
      const bx=x+inset,by=y+inset,bw=w-inset*2,bh=h-inset*2;
      if(bw<=1||bh<=1)continue;
      if(k<0.11){
        blocks+='<rect x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+bw.toFixed(1)
          +'" height="'+bh.toFixed(1)+'" rx="'+(px*0.14).toFixed(1)+'" fill="#c9e3ba"/>';
      }else if(k<0.155){
        // Two overlapping ellipses, so a lake has a shoreline rather than
        // being a perfect oval stamped on the block.
        const cx=bx+bw/2,cy=by+bh/2;
        blocks+='<g fill="#a3d1ef">'
          +'<ellipse cx="'+(cx-bw*0.10).toFixed(1)+'" cy="'+(cy-bh*0.06).toFixed(1)
            +'" rx="'+(bw*0.38).toFixed(1)+'" ry="'+(bh*0.34).toFixed(1)+'"/>'
          +'<ellipse cx="'+(cx+bw*0.12).toFixed(1)+'" cy="'+(cy+bh*0.10).toFixed(1)
            +'" rx="'+(bw*0.32).toFixed(1)+'" ry="'+(bh*0.28).toFixed(1)+'"/>'
        +'</g>';
      }else{
        const cols=1+Math.floor(csaHash(ix,jy*7+3)*3);     // 1..3
        const rows=1+Math.floor(csaHash(ix*11+5,jy)*3);    // 1..3
        const cw=bw/cols,ch=bh/rows,gap=Math.min(1.4,cw*0.14);
        for(let a=0;a<cols;a++)for(let b=0;b<rows;b++){
          const hh=csaHash(ix*73+a,jy*131+b);
          if(hh<0.20)continue;                             // yards, lanes, car parks
          const rw=Math.max(1.2,cw*(0.52+0.48*csaHash(ix*31+a,jy*17+b))-gap);
          const rh=Math.max(1.2,ch*(0.52+0.48*csaHash(ix*57+a,jy*23+b))-gap);
          if(rw>bw||rh>bh)continue;
          const ox=(cw-rw-gap)*csaHash(ix*13+a,jy*29+b);
          const oy=(ch-rh-gap)*csaHash(ix*19+a,jy*37+b);
          const tone=hh<0.46?'#ddd7ca':hh<0.76?'#d5cec0':'#e4dfd4';
          blocks+='<rect x="'+(bx+a*cw+Math.max(0,ox)).toFixed(1)
            +'" y="'+(by+b*ch+Math.max(0,oy)).toFixed(1)
            +'" width="'+rw.toFixed(1)+'" height="'+rh.toFixed(1)
            +'" rx="'+Math.min(1.4,rw*0.12).toFixed(1)+'" fill="'+tone+'"/>';
        }
      }
    }
  }

  /* ── Roads: casing under fill ──
     A road drawn as one white line reads as a gap in the page. Two strokes —
     a wider warm-grey under a narrower white — is what every real map does and
     is the single biggest thing separating this from a sketch. */
  const road=function(d,wCase,wFill){
    casing+='<path d="'+d+'" stroke="#d5cec0" stroke-width="'+wCase+'" fill="none" stroke-linecap="round"/>';
    fill+='<path d="'+d+'" stroke="#ffffff" stroke-width="'+wFill+'" fill="none" stroke-linecap="round"/>';
  };
  for(let ix=i0;ix<=i1;ix++){
    const x=sx(ix);
    if(x<-6||x>CSA_MAP_W+6)continue;
    const major=((ix%4)+4)%4===0;
    road('M'+x.toFixed(1)+' -4 V'+(CSA_MAP_H+4),major?9:5.4,major?6.6:3.4);
    if(major&&px>52){
      const nm=CSA_STREETS[Math.abs(ix)%CSA_STREETS.length];
      labels+='<text x="'+(x-0.5).toFixed(1)+'" y="'+(CSA_MAP_H-18)
        +'" fill="#94908a" font-size="6.4" font-family="inherit" text-anchor="middle" '
        +'transform="rotate(-90 '+(x-0.5).toFixed(1)+' '+(CSA_MAP_H-18)+')">'+attrSafe(nm)+'</text>';
    }
  }
  for(let jy=j0;jy<=j1;jy++){
    const y=sy(jy);
    if(y<-6||y>CSA_MAP_H+6)continue;
    const major=((jy%4)+4)%4===0;
    road('M-4 '+y.toFixed(1)+' H'+(CSA_MAP_W+4),major?9:5.4,major?6.6:3.4);
    if(major&&px>52){
      const nm=CSA_STREETS[Math.abs(jy*3+1)%CSA_STREETS.length];
      labels+='<text x="10" y="'+(y-3.2).toFixed(1)+'" fill="#94908a" font-size="6.4" '
        +'font-family="inherit">'+attrSafe(nm)+'</text>';
    }
  }

  // ── The fence and the pin ──
  const p=csaProject(v,csAttNum(loc.lat,v.cLat),csAttNum(loc.lng,v.cLng));
  const rPx=Math.max(4,csAttInt(loc.radius,100)/v.mpp);
  const fence='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+rPx.toFixed(1)
      +'" fill="#0f172a" fill-opacity=".07"/>'
    +'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+rPx.toFixed(1)
      +'" fill="none" stroke="#0f172a" stroke-opacity=".55" stroke-width="1.4" stroke-dasharray="5 4"/>';
  const pin='<g transform="translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+')">'
    +'<ellipse cx="0" cy="1.5" rx="6.5" ry="2.4" fill="rgba(15,23,42,.30)"/>'
    +'<path d="M0 -25a9.5 9.5 0 0 0-9.5 9.5C-9.5 -8.6 0 0 0 0s9.5-8.6 9.5-15.5A9.5 9.5 0 0 0 0 -25z" '
      +'fill="#0f172a" stroke="#fff" stroke-width="1.6"/>'
    +'<circle cx="0" cy="-15.5" r="3.4" fill="#fff"/>'
  +'</g>';

  // ── Scale bar: a round distance about 70px long at this zoom ──
  const nice=[1,2,5,10,20,25,50,100,200,250,500,1000,2000,5000];
  let dist=nice[0];
  for(let n=0;n<nice.length;n++){if(nice[n]/v.mpp<=78)dist=nice[n];}
  const barPx=Math.max(18,dist/v.mpp);
  const scale='<g transform="translate('+(CSA_MAP_W-barPx-12)+' '+(CSA_MAP_H-12)+')">'
    +'<rect x="-4" y="-15" width="'+(barPx+8)+'" height="19" rx="4" fill="#fff" fill-opacity=".78"/>'
    +'<rect x="0" y="-4" width="'+barPx.toFixed(1)+'" height="1.8" fill="#5c5a55"/>'
    +'<rect x="0" y="-7" width="1.8" height="7" fill="#5c5a55"/>'
    +'<rect x="'+(barPx-1.8).toFixed(1)+'" y="-7" width="1.8" height="7" fill="#5c5a55"/>'
    +'<text x="'+(barPx/2).toFixed(1)+'" y="-8" fill="#5c5a55" font-size="7" font-family="inherit" '
      +'text-anchor="middle">'+(dist>=1000?(dist/1000)+' km':dist+' m')+'</text>'
  +'</g>';

  return land+blocks+casing+fill+labels+fence+pin+scale;
}
function csaMapSVG(loc,i,editable){
  return '<svg class="csa-map-svg'+(editable?' is-live':'')+'" id="csa-map-'+i+'" '
    +'viewBox="0 0 '+CSA_MAP_W+' '+CSA_MAP_H+'" '
    +(editable?'onpointerdown="csAttMapDown(event,'+i+')" ':'')
    +'role="img" aria-label="Geofence of '+attrSafe(loc.name||'this location')
    +', '+csAttInt(loc.radius,100)+' metre radius">'
    +csaMapInner(loc,i)
  +'</svg>';
}
function csAttPaintMap(i){
  const svg=document.getElementById('csa-map-'+i);
  const loc=csaLoc(i);
  if(svg&&loc)svg.innerHTML=csaMapInner(loc,i);
}
function csAttPaintCoords(i){
  const loc=csaLoc(i);
  if(!loc)return;
  const la=document.getElementById('csa-lat-'+i),lo=document.getElementById('csa-lng-'+i);
  if(la)la.textContent=csAttNum(loc.lat,0).toFixed(6);
  if(lo)lo.textContent=csAttNum(loc.lng,0).toFixed(6);
}

/* ── Pointer: drag pans, a click without a drag drops the pin ──
   One gesture has to serve both, so the distinction is movement: under five
   pixels was a click, over it was a pan. Without that test every attempt to
   pan would also move the pin to wherever the finger came up. */
let csaDrag=null;
function csaSvgPoint(svg,ev){
  const r=svg.getBoundingClientRect();
  return {x:(ev.clientX-r.left)*CSA_MAP_W/r.width, y:(ev.clientY-r.top)*CSA_MAP_H/r.height};
}
function csAttMapDown(ev,i){
  if(i!==CSA_BR&&!csAttEdit)return;
  const svg=ev.currentTarget;
  const v=csaView(i);
  csaDrag={i:i,svg:svg,x0:ev.clientX,y0:ev.clientY,moved:0,cLat:v.cLat,cLng:v.cLng,
    scale:CSA_MAP_W/svg.getBoundingClientRect().width};
  svg.classList.add('is-dragging');
  document.addEventListener('pointermove',csAttMapMove);
  document.addEventListener('pointerup',csAttMapUp);
  document.addEventListener('pointercancel',csAttMapUp);
  ev.preventDefault();
}
function csAttMapMove(ev){
  if(!csaDrag)return;
  const dx=ev.clientX-csaDrag.x0, dy=ev.clientY-csaDrag.y0;
  csaDrag.moved=Math.max(csaDrag.moved,Math.abs(dx)+Math.abs(dy));
  if(csaDrag.moved<5)return;
  const v=csaView(csaDrag.i);
  // Dragging right must move the map right, which means the CENTRE goes left.
  v.cLng=csaDrag.cLng-(dx*csaDrag.scale*v.mpp)/csaLngScale(v.cLat);
  v.cLat=csaDrag.cLat+(dy*csaDrag.scale*v.mpp)/CSA_M_PER_DEG;
  if(csaDrag.raf)return;
  csaDrag.raf=requestAnimationFrame(function(){
    if(csaDrag){csaDrag.raf=0;csAttPaintMap(csaDrag.i);}
  });
}
function csAttMapUp(ev){
  if(!csaDrag)return;
  const d=csaDrag;csaDrag=null;
  document.removeEventListener('pointermove',csAttMapMove);
  document.removeEventListener('pointerup',csAttMapUp);
  document.removeEventListener('pointercancel',csAttMapUp);
  if(d.raf)cancelAnimationFrame(d.raf);
  d.svg.classList.remove('is-dragging');
  if(d.moved<5){
    const pt=csaSvgPoint(d.svg,ev);
    csAttSetPin(d.i,csaToLatLng(csaView(d.i),pt.x,pt.y));
  }else{
    csAttPaintMap(d.i);
  }
}
function csAttSetPin(i,ll){
  const loc=csaLoc(i);
  if(!loc)return;
  loc.lat=+ll.lat.toFixed(6);
  loc.lng=+ll.lng.toFixed(6);
  csAttPaintMap(i);
  csAttPaintCoords(i);
  csaChanged(i);
}
function csAttZoom(i,factor){
  const v=csaView(i);
  v.mpp=Math.min(400,Math.max(0.12,v.mpp*factor));
  v.userZoom=true;
  csAttPaintMap(i);
}
/* Puts the pin back in the middle AND refits the scale to the fence. It has to
   do both to be the escape hatch it is meant to be: after panning two streets
   away and zooming into a 20 m radius, recentring alone leaves you staring at
   a tint that fills the whole frame with no edge in sight. */
function csAttFitFence(i){
  const loc=csaLoc(i),v=csaView(i);
  if(!loc)return;
  v.cLat=csAttNum(loc.lat,v.cLat);
  v.cLng=csAttNum(loc.lng,v.cLng);
  v.mpp=csaFitMpp(loc.radius);
  v.userZoom=false;
  csAttPaintMap(i);
}
/* The one genuinely automatic coordinate. The rules are the clock-in card's,
   for the same reasons documented there: ask inside the click so the browser
   attributes the prompt to the gesture, and say plainly when a file:// page
   has had the API taken away from it rather than appearing to hang. */
// `onFix(lat,lng)` is optional — the branch form uses it to fill the address.
function csAttUseMyLocation(i,onFix){
  if(!navigator.geolocation){
    showToast('Location unavailable','error','This browser cannot report a location.');return;
  }
  if(window.isSecureContext===false){
    showToast('Location unavailable','error',
      'Needs the app served over https or localhost, not opened as a file.');return;
  }
  showToast('Locating…','info','Waiting for your browser to answer.');
  navigator.geolocation.getCurrentPosition(function(p){
    const v=csaView(i);
    v.cLat=p.coords.latitude;v.cLng=p.coords.longitude;
    csAttSetPin(i,{lat:p.coords.latitude,lng:p.coords.longitude});
    if(onFix)onFix(p.coords.latitude,p.coords.longitude);
    showToast('Pin moved to your location','success',
      'Accurate to about '+Math.round(p.coords.accuracy)+' m. Check the address still matches.');
  },function(err){
    showToast('Could not get your location','error',err&&err.code===1
      ?'Location access was denied for this page.'
      :'Check that location services are on for this device.');
  },{enableHighAccuracy:true,maximumAge:60000});
}
// Jumping to a saved place is the only path that fills the address in, because
// it is the only one that HAS an address to fill in with.
function csAttUsePlace(i,idx){csaFillFrom(i,CSA_PLACES[+idx]);}
// The Attendance tab's "Branch" picker: fills the card from a branch saved in
// Company Structure, name, address, pin and all.
function csAttUseBranch(i,idx){
  if(idx==='')return;
  const br=(csAtt.locations||[])[+idx];
  if(!br)return;
  csaFillFrom(i,br);
  const r=document.getElementById('csa-loc-rad-'+i);
  if(r)r.value=csAttInt(br.radius,100);
  csAttRadius(i,br.radius);
}
function csaFillFrom(i,place){
  const loc=csaLoc(i);
  if(!place||!loc)return;
  loc.name=place.name;loc.address=place.address;
  const v=csaView(i);
  v.cLat=place.lat;v.cLng=place.lng;
  csAttSetPin(i,{lat:place.lat,lng:place.lng});
  const n=document.getElementById('csa-loc-name-'+i),a=document.getElementById('csa-loc-addr-'+i);
  if(n)n.value=place.name;
  if(a)a.value=place.address;
}

/* ══ THE TAB ═══════════════════════════════════════════════════════════════ */
/* ══ THE TAB ═══════════════════════════════════════════════════════════════
   PLAIN, LIKE EVERY OTHER TAB IN THIS PANEL. Basic Details, Banking Details
   and Leaves are all one shape: a .lp-sb-view-header with the Edit button in
   it, then grids of .lp-sb-field-card, with a bold sub-heading wherever the
   list changes subject. This tab had grown a private shell of its own —
   tinted section heads, icon chips, a switch in every header — which read as a
   different product from the tab beside it. It uses the shared parts now, and
   the only thing that survived is the map, because nothing shared draws one.

   Edit is the sidebar's standard form for the same reason: .lp-sb-edit-form >
   .lp-sb-edit-section > .lp-sb-form-grid > .lp-sb-field, closed by
   .lp-sb-form-actions — the exact structure the Edit Holiday form uses two
   modules away, down to the .hd-check boxes the booleans sit in. */
const CSA_ICO={
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  hourglass:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2h12M6 22h12M8 2v4a4 4 0 0 0 4 4 4 4 0 0 0 4-4V2M8 22v-4a4 4 0 0 1 4-4 4 4 0 0 1 4 4v4"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  inbox:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  ruler:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21.3 8.7L8.7 21.3a1 1 0 0 1-1.4 0L2.7 16.7a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z"/><line x1="7.5" y1="10.5" x2="9.5" y2="12.5"/><line x1="10.5" y1="7.5" x2="12.5" y2="9.5"/><line x1="13.5" y1="4.5" x2="15.5" y2="6.5"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 6l7-3 8 4 7-3v15l-7 3-8-4-7 3z"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="7" x2="16" y2="21"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  trend:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  minus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/></svg>',
  crosshair:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  edit:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
};

// The panel's own read-only row — the same helper every sibling tab builds its
// detail grid from.
function csAttFc(icon,label,value,wide){
  return '<div class="lp-sb-field-card'+(wide?' is-wide':'')+'">'
    +'<div class="lp-sb-field-icon">'+icon+'</div>'
    +'<div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div>'
    +'<div class="lp-sb-field-value">'+(value!=null&&value!==''?value:'<span style="color:#9ca3af">-</span>')+'</div></div>'
  +'</div>';
}
// A bold line where the list changes subject — exactly what the Leaves tab
// puts above its "Leaves List".
function csAttSub(text,action){
  return '<div class="csa-sub">'+text+(action||'')+'</div>';
}
function csAttNote(text){
  return '<p class="csa-hint csa-hint-block">'+text+'</p>';
}
function csAttGroup(label,control,full,hint){
  return '<div class="lp-sb-field'+(full?' ep-form-full':'')+'">'
    +'<label>'+label+'</label>'+control
    +(hint?'<span class="csa-hint">'+hint+'</span>':'')
  +'</div>';
}
function csAttSelect(id,opts,value){
  return sbSelect(id,opts,value,'csAttOnChange');
}
// The sanctioned in-form boolean: .hd-check, the box the Edit Holiday form
// puts "Repeats every year" in.
function csAttCheck(id,on,text){
  return '<label class="hd-check csa-check"><input type="checkbox" id="'+id+'"'+(on?' checked':'')
    +' onchange="csAttOnChange()"><span>'+text+'</span></label>';
}
// A number field that says what its number counts.
function csAttUnit(id,value,unit,min,max,handler){
  return '<div class="csa-unit">'
    +'<input type="number" class="ep-form-input" id="'+id+'" value="'+attrSafe(value)+'"'
      +' min="'+(min==null?0:min)+'"'+(max!=null?' max="'+max+'"':'')+' step="1"'
      +' oninput="'+(handler||'csAttOnChange()')+'">'
    +'<span class="csa-unit-tag">'+unit+'</span>'
  +'</div>';
}
/* Marks the tab dirty so Cancel means something. Nothing else hangs off it —
   the draft is read from the form in one pass at Save, because reading every
   field on every keystroke is work done many times to answer a question asked
   once. */
// Overtime Allowed changed: the capping rule shows only while it is No.
function csAttOtPicked(v){
  const w=document.getElementById('csa-otcap-wrap');
  if(w)w.hidden=v!=='No';
  csAttOnChange();
}
function csAttOnChange(){
  if(!csAttEdit)return;
  csAttDirty=true;
  const el=document.getElementById('csa-dirty');
  if(el)el.classList.add('is-on');
}
function csAttOnOff(on){return on?'Enabled':'Disabled';}

// ── VIEW MODE ──
function csAttViewHTML(){
  const m=csAtt;
  const editBtn='<button class="lp-sb-view-edit-btn" onclick="csAttStartEdit()">'
    +CSA_ICO.edit+' Edit</button>';

  let out='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Attendance Settings</span>'
    +editBtn+'</div>'
    +'<div class="lp-sb-detail-grid">'
    +csAttFc(CSA_ICO.clock,'Attendance Mode',attrSafe(m.mode))
    +csAttFc(CSA_ICO.clock,'Daily Work Hours',m.dailyHours+' Hours')
    +csAttFc(CSA_ICO.clock,'Shift Type',attrSafe(m.shiftType))
    +csAttFc(CSA_ICO.trend,'Overtime Allowed',m.overtimeAllowed?'Yes':'No')
    +(!m.overtimeAllowed&&csAttCapApplies()?csAttFc(CSA_ICO.clock,'Work Hours Capping Rule',attrSafe(m.otCapRule||'—')):'')
    +csAttFc(CSA_ICO.hourglass,'Late Policy',m.latePolicy+' Minutes')
    +csAttFc(CSA_ICO.pin,'Geolocation',m.geolocation?'Enable':'Disable')    +'</div>';

  out+=csAttSub('Working Hours &amp; Grace')
    +'<div class="lp-sb-detail-grid">'
    +csAttFc(CSA_ICO.clock,'Start Time',csAttTime12(m.startTime))
    +csAttFc(CSA_ICO.clock,'End Time',csAttTime12(m.endTime))
    +csAttFc(CSA_ICO.cal,'Working Days',csAttList(m.workingDays))
    +csAttFc(CSA_ICO.cal,'Week Off Days',csAttList(m.weekOffDays))
    +csAttFc(CSA_ICO.hourglass,'Clock In Grace Time',m.clockInGrace+' mins')
    +csAttFc(CSA_ICO.hourglass,'Clock Out Grace Time',m.clockOutGrace+' mins')
    +'</div>';

  out+=csAttSub('Rules')
    +'<div class="lp-sb-detail-grid">'
    +csAttFc(CSA_ICO.lock,'Attendance Freeze',
      m.freezeEnabled?('Enabled &middot; after '+m.freezeDays+' days'):'Disabled')
    +csAttFc(CSA_ICO.inbox,'Request on Week Off / Holiday',
      m.weekOffRequest?'Allowed':'Not allowed')
    +csAttFc(CSA_ICO.user,'Approver',m.weekOffRequest?attrSafe(m.weekOffApprover):'—')
    +csAttFc(CSA_ICO.alert,'Absconding Flow',
      m.abscondEnabled?('Enabled &middot; after '+m.abscondDays+' days'):'Disabled')
    +csAttFc(CSA_ICO.doc,'Absence Action',
      m.abscondEnabled?attrSafe(m.abscondAction):'—',true)
    +'</div>';

  const locs=m.locations.length
    ? m.locations.map(function(loc,i){
        return '<div class="csa-loc">'
          +'<div class="csa-map-frame">'+csaMapSVG(loc,i,false)+'</div>'
          +'<div class="csa-loc-fields"><div class="lp-sb-detail-grid">'
            +csAttFc(CSA_ICO.pin,'Location Name',attrSafe(loc.name),true)
            +csAttFc(CSA_ICO.map,'Address',attrSafe(loc.address),true)
            +csAttFc(CSA_ICO.pin,'Latitude',csAttNum(loc.lat,0).toFixed(6))
            +csAttFc(CSA_ICO.pin,'Longitude',csAttNum(loc.lng,0).toFixed(6))
            +csAttFc(CSA_ICO.ruler,'Attendance Radius',loc.radius+' meters')
            +csAttFc(CSA_ICO.alert,'Status',attrSafe(loc.status||'Active'))
          +'</div></div>'
        +'</div>';
      }).join('')
    : '<div class="csa-empty">No attendance location has been set for this entity.</div>';
  out+=csAttSub('Attendance Location')+locs;
  return out;
}

// ── EDIT MODE ──
function csAttEditHTML(){
  const m=csAttDraft;
  const sec=function(title,body){
    return '<div class="lp-sb-edit-section">'
      +'<div class="lp-sb-section-title csa-sec-title">'+title+'</div>'
      +body
    +'</div>';
  };

  let out='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Edit Attendance Settings</span>'
    +'<span class="csa-dirty'+(csAttDirty?' is-on':'')+'" id="csa-dirty">Unsaved changes</span></div>';

  out+=sec('General','<div class="lp-sb-form-grid">'
    +csAttGroup('Attendance Mode',csAttSelect('csa-mode',CSA_MODES,m.mode))
    +csAttGroup('Shift Type',csAttSelect('csa-shift',CSA_SHIFTS,m.shiftType))
    +csAttGroup('Daily Work Hours',csAttUnit('csa-daily',m.dailyHours,'hours',1,24))
    +csAttGroup('Late Policy',csAttUnit('csa-late',m.latePolicy,'mins',0,240))
    /* A Yes / No choice, not a checkbox: picking No is what brings the
       Work Hours Capping Rule in beside it (csAttOtPicked). */
    +csAttGroup('Overtime Allowed',sbSelect('csa-ot',['Yes','No'],m.overtimeAllowed?'Yes':'No','csAttOtPicked'))
    +(csAttCapApplies()
      ? '<div id="csa-otcap-wrap"'+(m.overtimeAllowed?' hidden':'')+'>'
        +csAttGroup('Work Hours Capping Rule <span class="req">*</span>',csAttSelect('csa-otcap',CSA_OT_CAPS,m.otCapRule))
        +'</div>'
      : '')
    +csAttGroup('Geolocation',csAttCheck('csa-geo',m.geolocation,'Capture location on punch'))  +'</div>');

  out+=sec('Working Hours &amp; Grace','<div class="lp-sb-form-grid">'
    +csAttGroup('Start Time','<input type="time" class="ep-form-input" id="csa-start" value="'+attrSafe(m.startTime)+'" oninput="csAttOnChange()">')
    +csAttGroup('End Time','<input type="time" class="ep-form-input" id="csa-end" value="'+attrSafe(m.endTime)+'" oninput="csAttOnChange()">')
    +csAttGroup('Working Days',apMS('csa-wdays',CSA_DAYS,m.workingDays,'Select working days'))
    +csAttGroup('Week Off Days',apMS('csa-woffs',CSA_DAYS,m.weekOffDays,'Select week off days'))
    +csAttGroup('Clock In Grace Time',csAttUnit('csa-gin',m.clockInGrace,'mins',0,240))
    +csAttGroup('Clock Out Grace Time',csAttUnit('csa-gout',m.clockOutGrace,'mins',0,240))
  +'</div>');

  out+=sec('Rules','<div class="lp-sb-form-grid">'
    +csAttGroup('Attendance Freeze',csAttCheck('csa-freeze',m.freezeEnabled,'Lock past attendance'))
    +csAttGroup('Freeze After',csAttUnit('csa-freeze-days',m.freezeDays,'days',1,365))
    +csAttGroup('Week Off / Holiday Requests',csAttCheck('csa-woreq',m.weekOffRequest,'Allow requests'))
    +csAttGroup('Approver',csAttSelect('csa-approver',CSA_APPROVERS,m.weekOffApprover))
    +csAttGroup('Absconding Flow',csAttCheck('csa-abscond',m.abscondEnabled,'Raise a case'))
    +csAttGroup('Consecutive Absence Days',csAttUnit('csa-abscond-days',m.abscondDays,'days',1,365))
    +csAttGroup('Absence Action',csAttSelect('csa-abscond-action',CSA_ABSENCE_ACTIONS,m.abscondAction),true)
  +'</div>'
  +csAttNote('Past attendance is locked once the freeze window has passed. Requests on a week off or holiday go to the approver named above.'));

  const addBtn='<button type="button" class="csa-add-btn" onclick="csAttAddLocation()">'
    +CSA_ICO.plus+'Add Location</button>';
  const locs=m.locations.length
    ? m.locations.map(function(loc,i){return csAttLocEditHTML(loc,i,m.locations.length>1);}).join('')
    : '<div class="csa-empty">No location yet — add one to switch on geofenced attendance.</div>';
  out+=sec('Attendance Location'+addBtn,locs);

  out+='<div class="lp-sb-form-actions">'
    +'<button class="ep-cancel-btn" onclick="csAttCancelEdit()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="csAttSave()">Save Changes</button>'
  +'</div>';
  return '<div class="lp-sb-edit-form">'+out+'</div>';
}
function csAttLocEditHTML(loc,i,removable){
  // The branches from Company Structure — the saved list, not this draft, so
  // a card being typed into right now is not offered as its own source.
  const places='<select class="ep-form-select" onchange="csAttUseBranch('+i+',this.value);this.selectedIndex=0">'
    +'<option value="">Select a branch…</option>'
    +(csAtt.locations||[]).map(function(p,n){
      return '<option value="'+n+'">'+attrSafe(p.name)+((p.status||'Active')==='Active'?'':' (Inactive)')+'</option>';
    }).join('')
  +'</select>';
  return '<div class="csa-loc csa-loc-edit">'
    +csaMapColHTML(loc,i,removable)
    +'<div class="csa-loc-fields"><div class="lp-sb-form-grid">'
      +csAttGroup('Branch',places,true)
      +csAttGroup('Location Name','<input type="text" class="ep-form-input" id="csa-loc-name-'+i+'" value="'+attrSafe(loc.name)+'" placeholder="e.g. Head Office" oninput="csAttOnChange()">',true)
      +csAttGroup('Address','<input type="text" class="ep-form-input" id="csa-loc-addr-'+i+'" value="'+attrSafe(loc.address)+'" placeholder="Street, city, postcode" oninput="csAttOnChange()">',true,
        'The map cannot look an address up, so this one is yours to write.')
      +csAttGroup('Attendance Radius',
        csAttUnit('csa-loc-rad-'+i,loc.radius,'meters',10,20000,'csAttRadius('+i+',this.value)'))
    +'</div></div>'
  +'</div>';
}
// The live map with its tools and the two coordinate read-outs — shared by the
// Attendance tab's location cards and the Add / Edit Branch form.
function csaMapColHTML(loc,i,removable){
  return '<div class="csa-map-col">'
      +'<div class="csa-map-frame is-live">'
        +csaMapSVG(loc,i,true)
        +'<div class="csa-map-tools">'
          +'<button type="button" class="csa-map-btn" title="Zoom in" onclick="csAttZoom('+i+',0.625)">'+CSA_ICO.plus+'</button>'
          +'<button type="button" class="csa-map-btn" title="Zoom out" onclick="csAttZoom('+i+',1.6)">'+CSA_ICO.minus+'</button>'
          +'<button type="button" class="csa-map-btn" title="Fit the fence" onclick="csAttFitFence('+i+')">'+CSA_ICO.target+'</button>'
        +'</div>'
        +'<button type="button" class="csa-map-here" onclick="'+(i===CSA_BR?'csBrUseCurrent()':'csAttUseMyLocation('+i+')')+'">'
          +CSA_ICO.crosshair+'Use my location</button>'
        +(removable
          ? '<button type="button" class="csa-loc-del" title="Remove this location" onclick="csAttRemoveLocation('+i+')">'+CSA_ICO.trash+'</button>'
          : '')
        +'<span class="csa-map-hint">Drag to pan &middot; click to place the pin</span>'
      +'</div>'
      /* Outputs, not inputs. They are rendered as read-outs so there is no
         cursor to put in them and nothing to mistype — the map is the only
         thing that writes here. */
      +'<div class="csa-coords">'
        +'<div class="csa-coord"><span class="csa-coord-label">Latitude</span>'
          +'<span class="csa-coord-value" id="csa-lat-'+i+'">'+csAttNum(loc.lat,0).toFixed(6)+'</span></div>'
        +'<div class="csa-coord"><span class="csa-coord-label">Longitude</span>'
          +'<span class="csa-coord-value" id="csa-lng-'+i+'">'+csAttNum(loc.lng,0).toFixed(6)+'</span></div>'
      +'</div>'
    +'</div>';
}

function csAttendanceTabHTML(){
  // View mode has no pan or zoom worth keeping, so every entry to it starts
  // the maps centred on their pins again.
  if(!csAttEdit)csaResetViews();
  return '<div class="csa-tab">'+(csAttEdit?csAttEditHTML():csAttViewHTML())+'</div>';
}

// ── MODE + PERSISTENCE ──
function csAttStartEdit(){
  csAttDraft=csAttClone(csAtt);
  csAttEdit=true;csAttDirty=false;
  csaResetViews();
  isbTab('cs',renderCsSidebar);
}
function csAttCancelEdit(){
  csAttEdit=false;csAttDraft=null;
  const wasDirty=csAttDirty;csAttDirty=false;
  msCloseAll();csaResetViews();
  isbTab('cs',renderCsSidebar);
  if(wasDirty)showToast('Changes discarded','info','Attendance settings are unchanged.');
}
/* Read the whole form in one pass. Everything the user can touch is read from
   its control except the multi-selects and the pins, which already live in
   state because their controls write straight to the draft. */
function csAttReadForm(){
  const d=csAttDraft;
  if(!d)return;
  const val=function(id){const el=document.getElementById(id);return el?el.value:null;};
  const on=function(id){const el=document.getElementById(id);return !!(el&&el.checked);};
  d.mode=val('csa-mode')||d.mode;
  d.shiftType=val('csa-shift')||d.shiftType;
  d.dailyHours=Math.max(1,csAttInt(val('csa-daily'),d.dailyHours));
  d.latePolicy=csAttInt(val('csa-late'),d.latePolicy);
  d.overtimeAllowed=val('csa-ot')==='Yes';
  if(val('csa-otcap'))d.otCapRule=val('csa-otcap');
  d.geolocation=on('csa-geo');
  const s=val('csa-start'),e=val('csa-end');
  if(s)d.startTime=s;
  if(e)d.endTime=e;
  d.workingDays=getMSValue('csa-wdays');
  d.weekOffDays=getMSValue('csa-woffs');
  d.clockInGrace=csAttInt(val('csa-gin'),d.clockInGrace);
  d.clockOutGrace=csAttInt(val('csa-gout'),d.clockOutGrace);
  d.freezeEnabled=on('csa-freeze');
  d.freezeDays=Math.max(1,csAttInt(val('csa-freeze-days'),d.freezeDays));
  d.weekOffRequest=on('csa-woreq');
  d.weekOffApprover=val('csa-approver')||d.weekOffApprover;
  d.abscondEnabled=on('csa-abscond');
  d.abscondDays=Math.max(1,csAttInt(val('csa-abscond-days'),d.abscondDays));
  d.abscondAction=val('csa-abscond-action')||d.abscondAction;
  d.locations.forEach(function(loc,i){
    const n=val('csa-loc-name-'+i),a=val('csa-loc-addr-'+i),r=val('csa-loc-rad-'+i);
    if(n!=null)loc.name=n.trim();
    if(a!=null)loc.address=a.trim();
    loc.radius=Math.max(10,csAttInt(r,loc.radius));
  });
}
/* Refused BEFORE anything is written, and each refusal names the field that
   fixes it — a settings page that silently accepts a week with no working days
   in it has broken every attendance calculation downstream of here. */
function csAttSave(){
  csAttReadForm();
  const d=csAttDraft;
  if(!d.workingDays.length){showToast('Pick at least one working day','error','Working Hours');return;}
  if(!d.overtimeAllowed&&csAttCapApplies()&&CSA_OT_CAPS.indexOf(d.otCapRule)<0){
    showToast('Pick a Work Hours Capping Rule','error','General — required when Overtime Allowed is No.');return;
  }
  if(d.startTime>=d.endTime){showToast('End time must be after start time','error','Working Hours');return;}
  const clash=d.workingDays.filter(function(x){return d.weekOffDays.indexOf(x)>=0;});
  if(clash.length){
    showToast('A day cannot be both','error',clash.join(', ')+' is set as a working day and a week off.');
    return;
  }
  const badLoc=d.locations.find(function(l){return !l.name||!l.address;});
  if(badLoc){showToast('Every location needs a name and an address','error','Location');return;}
  csAtt=csAttClone(d);
  csAttEdit=false;csAttDraft=null;csAttDirty=false;
  msCloseAll();csaResetViews();
  isbTab('cs',renderCsSidebar);
  showToast('Attendance settings saved','success',
    csAtt.workingDays.length+' working days · '+csAttTime12(csAtt.startTime)+' – '+csAttTime12(csAtt.endTime));
}

// ── LOCATIONS ──
/* Adding one keeps what is already typed: read the form first, then push, then
   repaint — otherwise the new card arrives over a form that has just been
   thrown away. A new pin starts where the last one is, because the second
   office of a company is far more often down the road than on another
   continent. */
function csAttAddLocation(){
  csAttReadForm();
  const last=csAttDraft.locations[csAttDraft.locations.length-1];
  csAttDraft.locations.push({
    name:'',address:'',
    lat:last?last.lat:CSA_PLACES[0].lat,
    lng:last?last.lng:CSA_PLACES[0].lng,
    radius:100,status:'Active'
  });
  csAttDirty=true;csaResetViews();
  isbTab('cs',renderCsSidebar);
}
function csAttRemoveLocation(i){
  csAttReadForm();
  csAttDraft.locations.splice(i,1);
  csAttDirty=true;csaResetViews();
  isbTab('cs',renderCsSidebar);
}
// Redraws just this card's ring, so the number and the circle never disagree.
// A zoom the user set by hand is left alone; one we chose is refitted.
function csAttRadius(i,v){
  const loc=csaLoc(i);
  if(!loc)return;
  loc.radius=Math.max(10,csAttInt(v,loc.radius));
  const view=csaView(i);
  if(!view.userZoom)view.mpp=csaFitMpp(loc.radius);
  csAttPaintMap(i);
  csaChanged(i);
}

/* ══ COMPANY STRUCTURE → BRANCH ════════════════════════════════════════════
   A branch IS a work location: the list and the Add / Edit form here read and
   write csAtt.locations, the same records the Attendance tab fences clock-ins
   with. So the Allowed Radius set here is the Attendance Radius over there,
   and changing it in either place changes it in both.

   The form is the sidebar's standard edit form, drawn in place of the table
   (the same view-then-edit swap the Attendance tab does), with the shared map
   addressed as CSA_BR. */
let csBrIdx=null;        // null: the list; -1: adding; 0..n: editing that branch
let csBrDraft=null;
let csBrDirty=false;

function csBrOnChange(){
  if(csBrIdx===null)return;
  csBrDirty=true;
  const el=document.getElementById('csa-br-dirty');
  if(el)el.classList.add('is-on');
}

function csBranchTabHTML(){
  return csBrIdx===null?csBranchListHTML():csBranchFormHTML();
}

function csBranchListHTML(){
  const locs=csAtt.locations||[];
  /* Drawn with the same bar and table as the Attachments tab (.att-bar,
     .att-table / .csag-table) so every listing in the panel reads alike. */
  const editSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  const plusSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const rows=locs.length
    ? locs.map(function(l,i){
        const on=(l.status||'Active')==='Active';
        return '<tr>'
          +'<td class="csag-td csag-num">'+(i+1)+'</td>'
          +'<td class="csag-td"><div class="lp-c-main">'+attrSafe(l.name)+'</div></td>'
          +'<td class="csag-td csag-src csa-br-addr">'+attrSafe(l.address)+'</td>'
          +'<td class="csag-td">'+csAttInt(l.radius,100)+' m</td>'
          +'<td class="csag-td"><span class="lp-status-badge tone-'+(on?'ok':'idle')+'">'+(on?'Active':'Inactive')+'</span></td>'
          +'<td class="csag-td csag-act"><button class="att-row-btn" title="Edit branch" onclick="csBrOpen('+i+')">'+editSvg+'</button></td>'
        +'</tr>';
      }).join('')
    : '<tr><td colspan="6" class="csag-td" style="text-align:center;color:var(--gray);padding:28px">No branches yet.</td></tr>';
  return '<div class="att-bar">'
      +'<span class="att-count">'+locs.length+' branch'+(locs.length===1?'':'es')+'</span>'
      +'<div class="att-bar-actions"><button class="att-link" onclick="csBrOpen(-1)">'+plusSvg+'Add Branch</button></div>'
    +'</div>'
    +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr>'
      +'<th>Sr. No</th><th>Branch Name</th><th>Location</th><th>Radius</th><th>Status</th><th class="csag-act">Action</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

function csBranchFormHTML(){
  const b=csBrDraft,i=CSA_BR;
  /* Address search: "Use my current location" first, then the places the app
     already knows. Picking a place fills the address, names the branch if it
     has no name yet, and drops the pin there. Anything else typed is kept as
     written — the map cannot geocode it, so the pin is then placed by hand.
     A custom list rather than a <datalist>, because a datalist can only offer
     values, never an action like locating the user. */
  const addr='<div class="ms-wrap csa-addr-wrap">'
    +'<input type="text" class="ep-form-input" id="csa-loc-addr-'+i+'" value="'+attrSafe(b.address)+'"'
      +' placeholder="Search an address" autocomplete="off"'
      +' onfocus="csBrAddrOpen()" onclick="csBrAddrOpen()" oninput="csBrAddr(this.value)">'
    +'<div class="ms-dropdown csa-addr-dd" id="csa-br-addr-dd"></div>'
  +'</div>';
  return '<div class="lp-sb-edit-form">'
    +'<div class="lp-sb-view-header"><span class="lp-sb-section-title">'+(csBrIdx===-1?'Add Work Location':'Edit Work Location')+'</span>'
      +'<span class="csa-dirty'+(csBrDirty?' is-on':'')+'" id="csa-br-dirty">Unsaved changes</span></div>'
    +'<div class="lp-sb-edit-section"><div class="csa-loc csa-loc-edit">'
      +csaMapColHTML(b,i,false)
      +'<div class="csa-loc-fields"><div class="lp-sb-form-grid">'
        +csAttGroup('Location Name <span class="ar-req">*</span>','<input type="text" class="ep-form-input" id="csa-loc-name-'+i+'" value="'+attrSafe(b.name)+'" placeholder="e.g. Hyderabad Branch" oninput="csBrOnChange()">',true)
        +csAttGroup('Address <span class="ar-req">*</span>',addr,true,
          'Use your current location, pick a saved address, or type one and place the pin on the map.')
        +csAttGroup('Allowed Radius',
          csAttUnit('csa-loc-rad-'+i,b.radius,'meters',10,20000,'csAttRadius('+i+',this.value)'),false,
          'Also editable in the Attendance tab.')
        +csAttGroup('Status',sbSelect('csa-br-status',['Active','Inactive'],b.status||'Active','csBrOnChange'),false,
          'Inactive branches do not accept clock-ins.')
      +'</div></div>'
    +'</div></div>'
    +'<div class="lp-sb-form-actions">'
      +'<button class="ep-cancel-btn" onclick="csBrCancel()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="csBrSave()">'+(csBrIdx===-1?'Add Branch':'Save Changes')+'</button>'
    +'</div>'
  +'</div>';
}

function csBrOpen(idx){
  const src=idx>=0?csAtt.locations[idx]:null;
  csBrIdx=idx;
  csBrDraft=src?csAttClone(src):{
    name:'',address:'',lat:CSA_PLACES[0].lat,lng:CSA_PLACES[0].lng,radius:100,status:'Active'
  };
  csBrDirty=false;
  delete csaViews[CSA_BR];
  isbTab('cs',renderCsSidebar);
}
function csBrAddr(v){
  csBrOnChange();
  if(csBrDraft)csBrDraft.address=v;
  csBrAddrOpen();
}
// The suggestion list, filtered by what is typed. The current-location row is
// always first and never filtered out — it is the one option that does not
// depend on the app already knowing the address.
function csBrAddrOpen(){
  const dd=document.getElementById('csa-br-addr-dd');
  const inp=document.getElementById('csa-loc-addr-'+CSA_BR);
  if(!dd||!inp)return;
  const q=inp.value.trim().toLowerCase();
  const hits=CSA_PLACES.map(function(p,n){return {p:p,n:n};}).filter(function(o){
    return !q||o.p.address.toLowerCase().indexOf(q)>=0||o.p.name.toLowerCase().indexOf(q)>=0;
  });
  dd.innerHTML='<div class="cs-option csa-addr-opt csa-addr-here" role="option" onmousedown="event.preventDefault()" onclick="csBrUseCurrent()">'
      +CSA_ICO.crosshair+'<span class="csa-addr-txt"><b>Use my current location</b>'
      +'<small>Drop the pin where you are and fill the address</small></span></div>'
    +hits.map(function(o){
      return '<div class="cs-option csa-addr-opt" role="option" onmousedown="event.preventDefault()" onclick="csBrPickPlace('+o.n+')">'
        +CSA_ICO.pin+'<span class="csa-addr-txt"><b>'+attrSafe(o.p.address)+'</b><small>'+attrSafe(o.p.name)+'</small></span></div>';
    }).join('');
  if(!dd.classList.contains('ms-open')){msCloseAll();dd.classList.add('ms-open');}
  placeAnchoredMenu(dd,inp.getBoundingClientRect(),{alignLeft:true,width:inp.offsetWidth});
}
function csBrAddrClose(){
  const dd=document.getElementById('csa-br-addr-dd');
  if(dd)dd.classList.remove('ms-open');
}
function csBrPickPlace(n){
  csBrAddrClose();
  const nameEl=document.getElementById('csa-loc-name-'+CSA_BR);
  const keepName=nameEl&&nameEl.value.trim();
  csAttUsePlace(CSA_BR,n);
  if(keepName){csBrDraft.name=keepName;nameEl.value=keepName;}
  csBrOnChange();
}
/* Locate, drop the pin, then turn the coordinates into an address. The pin is
   the fact and lands first; the address is a reverse-geocode (the same free
   service the clock-in card names places with) and falls back to the
   coordinates if it is slow or unavailable, so the required field is never
   left empty by a network hiccup. */
function csBrUseCurrent(){
  csBrAddrClose();
  csAttUseMyLocation(CSA_BR,function(lat,lng){
    const inp=document.getElementById('csa-loc-addr-'+CSA_BR);
    const set=function(text){
      if(!csBrDraft)return;
      csBrDraft.address=text;
      if(inp)inp.value=text;
      csBrOnChange();
    };
    set(lat.toFixed(6)+', '+lng.toFixed(6));
    if(typeof fetch!=='function'||typeof AbortController!=='function')return;
    const ctl=new AbortController();
    const bail=setTimeout(function(){ctl.abort();},5000);
    fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude='+lat
        +'&longitude='+lng+'&localityLanguage=en',{signal:ctl.signal})
      .then(function(r){return r.ok?r.json():null;})
      .then(function(d){
        clearTimeout(bail);
        if(!d)return;
        const parts=[d.locality,d.city,d.principalSubdivision,d.postcode,d.countryName]
          .filter(function(x,k,a){return x&&a.indexOf(x)===k;});
        if(parts.length)set(parts.join(', '));
      })
      .catch(function(){clearTimeout(bail);});
  });
}
document.addEventListener('click',function(e){
  if(!e.target.closest('.csa-addr-wrap')&&!e.target.closest('#csa-br-addr-dd'))csBrAddrClose();
},true);
function csBrClose(){
  csBrIdx=null;csBrDraft=null;csBrDirty=false;
  delete csaViews[CSA_BR];
  isbTab('cs',renderCsSidebar);
}
function csBrCancel(){
  const was=csBrDirty;
  csBrClose();
  if(was)showToast('Changes discarded','info','The branch is unchanged.');
}
function csBrSave(){
  const b=csBrDraft;
  if(!b)return;
  const val=function(id){const el=document.getElementById(id);return el?el.value:'';};
  b.name=val('csa-loc-name-'+CSA_BR).trim();
  b.address=val('csa-loc-addr-'+CSA_BR).trim();
  b.radius=Math.max(10,csAttInt(val('csa-loc-rad-'+CSA_BR),b.radius));
  b.status=val('csa-br-status')||'Active';
  if(!b.name){showToast('Location Name is required','error','Branch');return;}
  if(!b.address){showToast('Address is required','error','Branch');return;}
  const adding=csBrIdx===-1,rec=csAttClone(b);
  if(adding)csAtt.locations.push(rec);else csAtt.locations[csBrIdx]=rec;
  /* An Attendance edit open at the same time holds its own copy of the list;
     bring it the same change, or its Save would quietly undo this one. */
  if(csAttDraft){
    if(adding)csAttDraft.locations.push(csAttClone(rec));
    else if(csAttDraft.locations[csBrIdx])csAttDraft.locations[csBrIdx]=csAttClone(rec);
  }
  csBrClose();
  showToast(adding?'Branch added':'Branch updated','success',
    rec.name+' · '+rec.radius+' m radius · '+rec.status);
}

/* Unsaved edits on the company panel's Attendance and Leaves tabs (sbDraftReg,
   core.js) - each tab keeps its own draft and dirty flag. */
sbDraftReg('cs',{
  dirty:function(){return !!((csAttEdit&&csAttDirty)||(csBrIdx!==null&&csBrDirty)||(typeof csLeaveEdit!=='undefined'&&csLeaveEdit&&csLeaveDirty));},
  tabs:function(){const t=[];if(csAttEdit&&csAttDirty)t.push('attendance');if(csBrIdx!==null&&csBrDirty)t.push('company-structure');if(typeof csLeaveEdit!=='undefined'&&csLeaveEdit&&csLeaveDirty)t.push('leaves');return t;},
  drop:function(){
    csAttEdit=false;csAttDraft=null;csAttDirty=false;
    csBrIdx=null;csBrDraft=null;csBrDirty=false;
    if(typeof csLeaveEdit!=='undefined'){csLeaveEdit=false;csLeaveDraft=null;csLeaveDirty=false;}
  }});
