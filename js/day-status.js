/* ══ WHAT KIND OF DAY WAS IT ═══════════════════════════════════════════════
   The timesheet knew four things about a day — present, absent, in progress,
   weekend — and "present" was doing far too much work. A day where somebody
   arrived forty minutes late and left an hour early was the same green as one
   worked start to finish, so the sheet answered "did they come in?" but never
   "did they keep the shift?", which is the question the hours are being
   checked against.

   EIGHT STATES, ONE FUNCTION. dsClassify() is the only place a day is judged;
   the calendar's rail colour and the day panel's tag both read it, so the two
   cannot disagree about a date.

     On Time       in and out both inside the grace windows
     Late Login    in after the start plus its grace
     Early Logout  out before the end minus its grace
     Late + Early  both of the above on the same day
     Leave         an approved absence
     Weekly Off    a day outside the entity's working days
     Holiday       a date on the entity's holiday calendar
     Absent        a working day with no punch on it

   THE SHIFT IS THE ENTITY'S, NOT A CONSTANT. Start, end and the two grace
   windows all come from Company Settings → Attendance, so widening the
   clock-in grace there re-colours the month here. That is the point of having
   put them in a settings page.

   THE TAGS LIVE IN THE DAY PANEL, NOT THE GRID. Seven lettered chips down a
   month of cells would compete with the hours, which are what the grid is for.
   A cell carries the state as the colour of its rail and nothing more; opening
   the day is what spells it out, in words and with the arithmetic behind it.
   There is no legend under the calendar — the tag names itself. */

const DS_DAY_KEYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* Tone is one of the app's five sanctioned status tones and nothing else.
   Late Login and Early Logout share amber deliberately: the status doctrine in
   main.css allows one meaning per hue, both are the same kind of thing — a
   single missed edge of the shift — and inventing a sixth colour to separate
   them would be the one place in the product where a hue meant something new.
   The label separates them; the severity ladder green → amber → red is what
   the colour carries. */
const DS_STATES={
  'ontime':      {label:'On Time',      tone:'ok',   desc:'On-time login and logout'},
  'late-login':  {label:'Late Login',   tone:'wait', desc:'Logged in after the grace time'},
  'early-logout':{label:'Early Logout', tone:'wait', desc:'Logged out before the grace time'},
  'late-early':  {label:'Late + Early', tone:'bad',  desc:'Both late login and early logout'},
  'leave':       {label:'Leave',        tone:'info', desc:'On approved leave'},
  'weekly-off':  {label:'Weekly Off',   tone:'idle', desc:'Outside the working days'},
  'holiday':     {label:'Holiday',      tone:'idle', desc:'Company holiday'},
  'absent':      {label:'Absent',       tone:'bad',  desc:'Working day with no punch'},
  'inprog':      {label:'In Progress',  tone:'wait', desc:'Clocked in, not yet out'},
  'na':          {label:'Not Applicable',tone:'idle',desc:'Still to come'}
};

function dsShift(){
  const s=(typeof csAtt!=='undefined'&&csAtt)?csAtt:null;
  return {
    start:dsMins((s&&s.startTime)||'09:00'),
    end:dsMins((s&&s.endTime)||'18:00'),
    graceIn:(s&&s.clockInGrace!=null)?s.clockInGrace:15,
    graceOut:(s&&s.clockOutGrace!=null)?s.clockOutGrace:15
  };
}
function dsMins(t){
  let m=/^(\d{1,2}):(\d{2})$/.exec(String(t||'').trim());
  if(m)return (+m[1])*60+(+m[2]);
  m=/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(t||'').trim());
  if(!m)return null;
  let h=(+m[1])%12;
  if(/pm/i.test(m[3]))h+=12;
  return h*60+(+m[2]);
}
function dsPad(n){return n<10?'0'+n:''+n;}
// "1h 05m" / "40m" — a duration a person reads, not a decimal.
function dsDur(mins){
  if(mins==null)return '';
  const h=Math.floor(mins/60),m=mins%60;
  return h?(h+'h '+dsPad(m)+'m'):(m+'m');
}
function dsClock(mins){
  if(mins==null)return '—';
  let h=Math.floor(mins/60);
  const ap=h>=12?'PM':'AM';
  h=h%12||12;
  return h+':'+dsPad(mins%60)+' '+ap;
}

/* The judgement. Returns a DS_STATES entry plus the numbers behind it, so the
   panel can say HOW late rather than only that it was late. */
function dsClassify(iso){
  const att=(typeof tsAttendance!=='undefined')?tsAttendance[iso]:null;
  const closed=(typeof arNonWorkingDay==='function')?arNonWorkingDay(iso):null;
  const shift=dsShift();
  const out={key:'absent',late:0,early:0,inM:null,outM:null,shift:shift,label:''};

  if(att&&att.status==='leave'){out.key='leave';out.label=att.leaveType||'Leave';return dsFill(out);}
  if(att&&att.status==='inprog'){
    out.key='inprog';out.inM=dsMins(att.in);
    if(out.inM!=null&&out.inM>shift.start+shift.graceIn)out.late=out.inM-shift.start;
    return dsFill(out);
  }
  if(att&&att.status!=='absent'){
    out.inM=dsMins(att.in);out.outM=dsMins(att.out);
    /* A CLOSED DAY IS NEVER LATE. Late and early are measured against a shift,
       and a weekly off or a holiday has no shift to be measured against —
       somebody who came in at ten on a Saturday and left at four was not late
       and did not leave early, they worked a day nobody asked them to. Judging
       the punch anyway had a covered Saturday reading "Late + Early", which
       reads as a reprimand for volunteering. The day keeps its own state; the
       hours still show, and the attendance request is what gets them counted. */
    if(closed){
      out.key=closed.kind==='Holiday'?'holiday':'weekly-off';
      out.label=closed.label;
      return dsFill(out);
    }
    if(out.inM!=null&&out.inM>shift.start+shift.graceIn)out.late=out.inM-shift.start;
    if(out.outM!=null&&out.outM<shift.end-shift.graceOut)out.early=shift.end-out.outM;
    out.key=out.late&&out.early?'late-early':out.late?'late-login':out.early?'early-logout':'ontime';
    return dsFill(out);
  }
  if(closed){out.key=closed.kind==='Holiday'?'holiday':'weekly-off';out.label=closed.label;return dsFill(out);}
  const today=(typeof TS_TODAY!=='undefined')?TS_TODAY:'';
  if(today&&iso>today){out.key='na';return dsFill(out);}
  return dsFill(out);
}
function dsFill(o){
  const s=DS_STATES[o.key]||DS_STATES.absent;
  o.state=s.label;o.tone=s.tone;
  return o;
}
// The rail colour on a month cell — the only mark the grid carries.
function dsRailClass(iso){
  const c=dsClassify(iso);
  return c.key==='na'?'':' ds-'+c.tone;
}

/* ── The tag, for the day panel ──
   Says the state, then the arithmetic behind it. "Late Login" alone invites
   the question this line answers: late against what, and by how much. */
function dsTagHTML(iso){
  const c=dsClassify(iso);
  if(c.key==='na')return '';
  const bits=[];
  if(c.late)bits.push('In '+dsDur(c.late)+' after '+dsClock(c.shift.start));
  if(c.early)bits.push('Out '+dsDur(c.early)+' before '+dsClock(c.shift.end));
  if(c.key==='inprog'&&!c.late)bits.push('In at '+dsClock(c.inM)+', not yet out');
  if(!bits.length&&c.key==='absent')bits.push('No punch against a working day');
  /* The label only earns a line when it says something the state did not — a
     holiday's name does, "Weekly Off" under "Weekly Off" does not. */
  if(!bits.length&&c.label&&c.label!==c.state)bits.push(c.label);
  return '<div class="ds-tagrow">'
    +'<span class="ds-tag tone-'+c.tone+'">'+c.state+'</span>'
    +(bits.length?'<span class="ds-tag-why">'+bits.join(' · ')+'</span>':'')
  +'</div>';
}

/* ── The month's totals, for the calendar header ──
   Working days counts the days the entity actually asked for — closed days and
   days still to come are not working days nobody turned up for. */
function dsMonthTotals(dates){
  const t={working:0,leaves:0};
  dates.forEach(function(iso){
    const c=dsClassify(iso);
    if(c.key==='leave')t.leaves++;
    if(c.key!=='weekly-off'&&c.key!=='holiday'&&c.key!=='na')t.working++;
  });
  return t;
}
