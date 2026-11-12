/* ══ TIMESHEET → EXCEL EXPORT ═══════════════════════════════════════════════
   The timesheet could be read on screen and nowhere else. Everything a payroll
   or compliance question actually needs — a month of punches for one person, a
   period across several, the totals underneath them — had to be copied out by
   hand or screenshotted. This is the way out of the page.

   THE PANEL ASKS FOUR QUESTIONS, IN THE ORDER THEY NARROW THE FILE:
     1  WHOSE record        one person on My Timesheet, any set on All
     2  WHAT SHAPE          a day-wise sheet, or a month / year roll-up
     3  WHICH PERIOD        a single date, a handful of dates, or a range
     4  WHICH COLUMNS       three groups, ticked independently
   Each answer changes what the next one can be, and the panel says so rather
   than letting anyone build a file that cannot exist: the attendance-detail
   columns are per-day facts, so they go quiet the moment a monthly roll-up is
   asked for. A greyed group with a reason beats a silent one.

   THE FILE IS ALWAYS ONE SHEET, and every ticked column is on it — see THE
   SHEET below for what that means for the summary totals.

   IT INHERITS THE FILTER ALREADY ON SCREEN. Opening the panel seeds the period
   from the page's own range (My Timesheet) or month (All Timesheet), because
   the export people want ninety-nine times out of a hundred is the thing they
   are looking at. Column ticks persist across openings; the period does not,
   since the filter behind it may have moved.

   WHY THE FILE IS WRITTEN BY HAND. A real .xlsx is a zip of XML parts, and the
   only expensive piece is the compression — which is optional. Every member
   here is STORED, so the whole writer is a CRC table and two record headers,
   with no library to load, no CDN to be offline, and no CSV pretending to be a
   spreadsheet. Excel, Numbers, Sheets and LibreOffice all open it as the
   native workbook it is: styled header, frozen pane, filter row, sized
   columns.

   WHAT THE DATA IS. The prototype holds one attendance fixture (tsAttendance)
   and the calendar view renders it for whichever employee is being looked at,
   so the export does the same — the file matches the screen for every person
   selected. Holidays are the real thing, read from the entity's own calendar,
   and weekly offs come off the date. Nothing here invents a figure the app
   does not already show. */

// ── SHIFT RULES ──
/* ONE SHIFT, AND IT IS THE ENTITY'S. These were four constants here, which
   meant the export judged lateness against 09:00/18:00 with a 15-minute grace
   whatever Company Settings → Attendance actually said — so widening the grace
   there changed the colour of a day on the timesheet and left the exported
   "Late Login (min)" column disagreeing with it. dsShift() reads the settings;
   the constants below are only the fallback for a build without them.

   stdHours stays a constant because it is not in that settings page: it is the
   length of a standard day used to work out overtime, and Daily Work Hours is
   the field it will come from when overtime is wired up. */
function TSX_SHIFT_OF(){
  const s=(typeof dsShift==='function')?dsShift():null;
  return s
    ? {start:s.start,end:s.end,graceIn:s.graceIn,graceOut:s.graceOut,stdHours:9}
    : {start:9*60,end:18*60,graceIn:15,graceOut:15,stdHours:9};
}

const TSX_MON_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TSX_MON_LONG=['January','February','March','April','May','June','July','August','September','October','November','December'];
const TSX_DOW=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* THE THREE REPORT SHAPES. `grain` is what one row of the main sheet is; it is
   the only thing that really differs between them, and everything downstream
   reads it rather than re-testing the id. */
const TSX_VIEWS=[
  {id:'daily',  label:'Detailed Day-wise', sub:'One row per employee, per day',   grain:'day'},
  {id:'monthly',label:'Monthly Summary',   sub:'One row per employee, per month', grain:'month'},
  {id:'yearly', label:'Yearly Summary',    sub:'One row per employee, per year',  grain:'year'}
];

/* THE COLUMN CATALOGUE. `views` is which report shapes a group means anything
   in — that is what greys the attendance-detail group out on a roll-up, rather
   than a special case buried in the renderer. `def` is the tick it opens with:
   the columns a first export should already contain.

   THERE IS NO "DEPARTMENT" COLUMN because the app has no department: the
   employee record carries a role, a country and an entity, and a column of
   dashes is worse than one that was never offered. */
const TSX_GROUPS=[
  {id:'emp',label:'Employee Details',views:['daily','monthly','yearly'],fields:[
    {id:'empId',      label:'Employee ID',      def:1,w:13},
    {id:'empName',    label:'Employee Name',    def:1,w:22},
    {id:'empStatus',  label:'Employee Status',  def:1,w:16},
    {id:'designation',label:'Designation',      def:1,w:22},
    {id:'country',    label:'Country',          def:0,w:12},
    {id:'entity',     label:'Entity',           def:0,w:18}
  ]},
  {id:'att',label:'Attendance Details',views:['daily'],fields:[
    {id:'attStatus',  label:'Attendance Status',def:1,w:17},
    {id:'clockIn',    label:'Clock-In Time',    def:1,w:14},
    {id:'clockOut',   label:'Clock-Out Time',   def:1,w:15},
    {id:'workHours',  label:'Work Hours',       def:1,w:12,num:1},
    {id:'lateLogin',  label:'Late Login (min)', def:0,w:15,num:1},
    {id:'earlyLogout',label:'Early Logout (min)',def:0,w:17,num:1},
    {id:'overtime',   label:'Overtime (h)',     def:1,w:13,num:1},
    {id:'location',   label:'Location',         def:0,w:26},
    {id:'source',     label:'Entry Source',     def:0,w:14}
  ]},
  {id:'sum',label:'Attendance Summary',views:['daily','monthly','yearly'],fields:[
    {id:'totalWorkingDays', label:'Total Working Days', def:1,w:19,num:1},
    {id:'presentDays',      label:'Present Days',       def:1,w:14,num:1},
    {id:'absentDays',       label:'Absent Days',        def:1,w:13,num:1},
    {id:'leaveDays',        label:'Leave Days',         def:1,w:12,num:1},
    {id:'weeklyOffs',       label:'Weekly Offs',        def:1,w:13,num:1},
    {id:'holidays',         label:'Holidays',           def:1,w:11,num:1},
    {id:'totalHours',       label:'Total Work Hours',   def:1,w:18,num:1},
    {id:'totalOvertime',    label:'Total Overtime (h)', def:1,w:19,num:1},
    {id:'totalLateLogins',  label:'Total Late Logins',  def:0,w:18,num:1},
    {id:'totalEarlyLogouts',label:'Total Early Logouts',def:0,w:20,num:1}
  ]}
];
function tsxField(id){
  for(let g=0;g<TSX_GROUPS.length;g++){
    const f=TSX_GROUPS[g].fields.find(function(x){return x.id===id;});
    if(f)return f;
  }
  return null;
}
function tsxDefaultFields(){
  const o={};
  TSX_GROUPS.forEach(function(g){g.fields.forEach(function(f){o[f.id]=!!f.def;});});
  return o;
}
// A group is live only for the report shape it describes.
function tsxGroupLive(g){return g.views.indexOf(tsxState.view)>=0;}

/* PANEL STATE. Held in one object so the whole dialog can be described, reset
   and read back without hunting through the DOM for what is ticked. */
let tsxState={
  open:false,
  scope:'my',        // 'my' — one fixed person | 'all' — pick from the list
  fixedEmp:null,     // that person, when scope is 'my'
  emps:[],           // selected employee ids, when scope is 'all'
  empListOpen:false,
  empQuery:'',
  view:'daily',
  period:'range',    // 'single' | 'multi' | 'range'
  single:'',
  multi:[],
  from:'',
  to:'',
  fields:tsxDefaultFields()
};

// ── SMALL SHARED HELPERS ──
function tsxPad(n){return n<10?'0'+n:''+n;}
function tsxISO(d){return d.getFullYear()+'-'+tsxPad(d.getMonth()+1)+'-'+tsxPad(d.getDate());}
function tsxParse(iso){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');
  return m?new Date(+m[1],+m[2]-1,+m[3]):null;
}
function tsxLabel(iso){const d=tsxParse(iso);return d?d.getDate()+' '+TSX_MON_SHORT[d.getMonth()]+' '+d.getFullYear():'';}
function tsxMins(t){
  const m=/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(t||'').trim());
  if(!m)return null;
  let h=(+m[1])%12;
  if(/pm/i.test(m[3]))h+=12;
  return h*60+(+m[2]);
}
function tsxHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function tsxAttr(s){return tsxHtml(s).replace(/"/g,'&quot;');}
function tsxRound(n){return Math.round(n*100)/100;}

/* ══ 1 · WHO ═══════════════════════════════════════════════════════════════
   My Timesheet is one person's own record and the calendar opened from a row
   on All Timesheet is one named person's, so both fix the employee rather than
   offering a picker that could only ever have one answer. Only the All
   Timesheet listing, which is a set to begin with, gets the multi-select. */
function tsxRoster(){return (typeof allTsData!=='undefined'&&allTsData)?allTsData:[];}
function tsxEntityName(){
  return (typeof hdCurrentEntityName==='function'?hdCurrentEntityName():'')||'Dhi Hyperlocal';
}
// The person whose sheet is on screen, matched back to the real roster row so
// the export carries their id, status and country rather than a name alone.
function tsxScreenEmp(){
  const viewing=(typeof atViewedEmp!=='undefined'&&atViewedEmp)?atViewedEmp:null;
  const onView=(typeof page!=='undefined'&&page==='at-timesheet-view');
  const who=(onView&&viewing)?viewing:(typeof tsEmp!=='undefined'?tsEmp:null);
  if(!who)return null;
  const match=tsxRoster().find(function(e){return e.name===who.name;});
  return match||{empId:'—',name:who.name,role:who.role||'Employee',
    empStatus:'Active',country:'-',initials:who.initials||''};
}
// Whatever the panel is currently pointed at, as roster rows.
function tsxSelectedEmps(){
  if(tsxState.scope==='my')return tsxState.fixedEmp?[tsxState.fixedEmp]:[];
  return tsxRoster().filter(function(e){return tsxState.emps.indexOf(e.empId)>=0;});
}
function tsxToggleEmp(id){
  const i=tsxState.emps.indexOf(id);
  if(i>=0)tsxState.emps.splice(i,1);else tsxState.emps.push(id);
  tsxPaintEmp();tsxPaintFoot();
}
function tsxRemoveEmp(id){
  const i=tsxState.emps.indexOf(id);
  if(i>=0)tsxState.emps.splice(i,1);
  tsxPaintEmp();tsxPaintFoot();
}
function tsxAllEmps(on){
  tsxState.emps=on?tsxRoster().map(function(e){return e.empId;}):[];
  tsxPaintEmp();tsxPaintFoot();
}
function tsxToggleEmpList(){
  tsxState.empListOpen=!tsxState.empListOpen;
  if(!tsxState.empListOpen)tsxState.empQuery='';
  tsxPaintEmp();
}
function tsxEmpSearch(v){
  tsxState.empQuery=v;
  const list=document.getElementById('tsx-emp-options');
  if(list)list.innerHTML=tsxEmpOptionsHTML();
}

/* ══ 2 · WHAT SHAPE ════════════════════════════════════════════════════════ */
function tsxSetView(v){
  if(tsxState.view===v)return;
  tsxState.view=v;
  tsxPaintView();tsxPaintFields();tsxPaintFoot();
}

/* ══ 3 · WHICH PERIOD ══════════════════════════════════════════════════════
   Three ways of naming a period, because the three questions people bring to a
   timesheet are genuinely different shapes: one day (what happened on the 19th),
   a handful of days (the four days under query), and a stretch (the pay month). */
function tsxSetPeriod(p){
  if(tsxState.period===p)return;
  tsxState.period=p;
  tsxPaintPeriod();tsxPaintFoot();
}
// apCD calls its onpick hook with the ISO value only, so one named wrapper per
// field — and they must be function declarations to be reachable as window.<n>.
function tsxPickSingle(v){tsxState.single=v;tsxPaintFoot();}
function tsxPickFrom(v){tsxState.from=v;tsxPaintFoot();}
function tsxPickTo(v){tsxState.to=v;tsxPaintFoot();}
function tsxPickAdd(v){
  if(v&&tsxState.multi.indexOf(v)<0)tsxState.multi.push(v);
  tsxState.multi.sort();
  tsxPaintPeriod();tsxPaintFoot();
}
function tsxRemoveDate(iso){
  const i=tsxState.multi.indexOf(iso);
  if(i>=0)tsxState.multi.splice(i,1);
  tsxPaintPeriod();tsxPaintFoot();
}
/* The dates the file will actually cover. A backwards range is tolerated the
   same way the page's own range filter tolerates it — swapped, not refused —
   and the span is capped so a mistyped year cannot ask for four million rows. */
const TSX_MAX_DAYS=1830;   // five years
function tsxDates(){
  const s=tsxState;
  if(s.period==='single')return s.single?[s.single]:[];
  if(s.period==='multi')return s.multi.slice().sort();
  let from=s.from,to=s.to;
  if(!from||!to)return [];
  if(from>to){const t=from;from=to;to=t;}
  const a=tsxParse(from),b=tsxParse(to);
  if(!a||!b)return [];
  const out=[];
  for(let d=new Date(a);d<=b&&out.length<TSX_MAX_DAYS;d.setDate(d.getDate()+1))out.push(tsxISO(d));
  return out;
}
function tsxPeriodLabel(){
  const s=tsxState,d=tsxDates();
  if(!d.length)return 'No period selected';
  if(s.period==='single')return tsxLabel(d[0]);
  if(s.period==='multi')return d.length+' selected date'+(d.length===1?'':'s');
  return tsxLabel(d[0])+' → '+tsxLabel(d[d.length-1]);
}

/* ══ 4 · WHICH COLUMNS ═════════════════════════════════════════════════════ */
function tsxToggleField(id,el){
  tsxState.fields[id]=!tsxState.fields[id];
  if(el)el.classList.toggle('is-on',tsxState.fields[id]);
  const grp=el?el.closest('.tsx-grp'):null;
  if(grp)tsxPaintGroupHead(grp);
  tsxPaintFoot();
}
function tsxGroupAll(gid,on){
  const g=TSX_GROUPS.find(function(x){return x.id===gid;});
  if(!g)return;
  g.fields.forEach(function(f){tsxState.fields[f.id]=!!on;});
  tsxPaintFields();tsxPaintFoot();
}
function tsxGroupCount(g){
  return g.fields.filter(function(f){return tsxState.fields[f.id];}).length;
}
function tsxPaintGroupHead(grpEl){
  const gid=grpEl.getAttribute('data-grp');
  const g=TSX_GROUPS.find(function(x){return x.id===gid;});
  if(!g)return;
  const c=grpEl.querySelector('.tsx-grp-count');
  if(c)c.textContent=tsxGroupCount(g)+'/'+g.fields.length;
}
// The columns the main sheet will carry, in catalogue order.
function tsxActiveFields(gid){
  const g=TSX_GROUPS.find(function(x){return x.id===gid;});
  if(!g)return [];
  return g.fields.filter(function(f){return tsxState.fields[f.id];});
}

/* ══ THE DAY ITSELF ════════════════════════════════════════════════════════
   One date resolved into the row the sheet prints. The order of the tests is
   the meaning: a punch WINS over the calendar, because a worked Saturday and a
   worked public holiday are exactly the days an export exists to surface, and
   a grid that called them "Weekly Off" would be hiding paid work. */
function tsxHolidayOn(iso){
  if(typeof holidaysData==='undefined')return null;
  const ent=tsxEntityName();
  return holidaysData.find(function(h){
    return h.date===iso&&h.entity===ent&&h.status!=='Inactive';
  })||null;
}
function tsxToday(){return (typeof TS_TODAY!=='undefined')?TS_TODAY:tsxISO(new Date());}
function tsxDay(iso){
  const d=tsxParse(iso);
  const att=(typeof tsAttendance!=='undefined')?tsAttendance[iso]:null;
  const hol=tsxHolidayOn(iso);
  const weekend=d?(d.getDay()===0||d.getDay()===6):false;
  const row={
    date:iso,
    day:d?TSX_DOW[d.getDay()]:'',
    status:'Absent',
    clockIn:'',clockOut:'',
    hours:null,late:null,early:null,overtime:null,
    location:'',source:'',
    counts:'working'   // 'working' | 'off' | 'holiday' | 'na'
  };
  if(att){
    const hrs=parseFloat(att.hours);
    row.status=att.status==='inprog'?'In Progress':att.status==='leave'?'On Leave':att.status==='absent'?'Absent':'Present';
    row.clockIn=att.in&&att.in!=='--'?att.in:'';
    row.clockOut=att.out&&att.out!=='--'?att.out:'';
    row.hours=isNaN(hrs)?null:tsxRound(hrs);
    row.source=att.src||'';
    const place=(typeof TS_PLACES!=='undefined'&&TS_PLACES[att.loc])?TS_PLACES[att.loc].label:(att.loc||'');
    row.location=place;
    const inM=tsxMins(row.clockIn),outM=tsxMins(row.clockOut);
    const shift=TSX_SHIFT_OF();
    if(inM!=null&&inM>shift.start+shift.graceIn)row.late=inM-shift.start;
    if(outM!=null&&outM<shift.end-shift.graceOut)row.early=shift.end-outM;
    if(row.hours!=null&&row.hours>shift.stdHours)row.overtime=tsxRound(row.hours-shift.stdHours);
    row.counts='working';
    return row;
  }
  if(hol){row.status='Holiday'+(hol.name?' — '+hol.name:'');row.counts='holiday';return row;}
  if(weekend){row.status='Weekly Off';row.counts='off';return row;}
  if(iso>tsxToday()){row.status='Not Applicable';row.counts='na';return row;}
  return row;                                   // a past weekday with no punch
}
// The totals under any set of days — the summary sheet and both roll-ups read
// the same function, so a month total can never disagree with its own days.
function tsxTotals(days){
  const t={totalWorkingDays:0,presentDays:0,absentDays:0,leaveDays:0,weeklyOffs:0,
    holidays:0,totalHours:0,totalOvertime:0,totalLateLogins:0,totalEarlyLogouts:0};
  days.forEach(function(r){
    if(r.counts==='off')t.weeklyOffs++;
    else if(r.counts==='holiday')t.holidays++;
    else if(r.counts==='working'){
      t.totalWorkingDays++;
      if(r.status==='Present'||r.status==='In Progress')t.presentDays++;
      else if(r.status==='On Leave')t.leaveDays++;
      else t.absentDays++;
    }
    if(r.hours)t.totalHours+=r.hours;
    if(r.overtime)t.totalOvertime+=r.overtime;
    if(r.late)t.totalLateLogins++;
    if(r.early)t.totalEarlyLogouts++;
  });
  t.totalHours=tsxRound(t.totalHours);
  t.totalOvertime=tsxRound(t.totalOvertime);
  return t;
}
// One employee's value for an Employee Details column.
function tsxEmpValue(emp,fid){
  if(fid==='empId')return emp.empId;
  if(fid==='empName')return emp.name;
  if(fid==='empStatus')return emp.empStatus||'Active';
  if(fid==='designation')return emp.role||'—';
  if(fid==='country')return emp.country&&emp.country!=='-'?emp.country:'—';
  if(fid==='entity')return tsxEntityName();
  return '';
}
function tsxDayValue(row,fid){
  if(fid==='attStatus')return row.status;
  if(fid==='clockIn')return row.clockIn||'—';
  if(fid==='clockOut')return row.clockOut||'—';
  if(fid==='workHours')return row.hours;
  if(fid==='lateLogin')return row.late;
  if(fid==='earlyLogout')return row.early;
  if(fid==='overtime')return row.overtime;
  if(fid==='location')return row.location||'—';
  if(fid==='source')return row.source||'—';
  return '';
}

/* ══ THE SHEET ═════════════════════════════════════════════════════════════
   ONE SHEET, ALWAYS, carrying every column that was ticked. The summary
   columns are period totals rather than facts about a single day, so on a
   day-wise export they are repeated down each employee's rows — the same
   figure on all thirty of them.

   That repetition is deliberate and was asked for. The alternative this used
   to do was a second sheet of totals beside the days, which keeps a pivot
   table clean but hands you a workbook to flip between; a single flat sheet is
   what filters, sorts and gets pasted into another system in one go. Worth
   knowing if a pivot is ever built on this: group by employee and take MAX (or
   MIN, or AVERAGE) of a total column rather than SUM, since summing a repeated
   figure multiplies it by the number of days. */
function tsxBuildSheets(){
  const dates=tsxDates();
  const emps=tsxSelectedEmps();
  const empCols=tsxActiveFields('emp');
  const attCols=tsxActiveFields('att');
  const sumCols=tsxActiveFields('sum');
  const view=tsxState.view;
  const meta=[
    'Entity: '+tsxEntityName()+'   ·   Report: '+(TSX_VIEWS.find(function(v){return v.id===view;})||{}).label,
    'Period: '+tsxPeriodLabel()+'   ·   Employees: '+emps.length+'   ·   Generated: '+tsxNowLabel()
  ];
  const sheets=[];

  if(view==='daily'){
    const cols=empCols.map(function(f){return {label:f.label,w:f.w};})
      .concat([{label:'Date',w:12},{label:'Day',w:12}])
      .concat(attCols.map(function(f){return {label:f.label,w:f.w,num:f.num};}))
      .concat(sumCols.map(function(f){return {label:f.label,w:f.w,num:f.num};}));
    const rows=[];
    emps.forEach(function(emp){
      /* Worked out ONCE per employee, then repeated down their rows. The
         figure is a property of the person over the whole period, not of the
         day the row is about, so recomputing it per row would be the same sum
         done thirty times for one answer. */
      const t=sumCols.length?tsxTotals(dates.map(tsxDay)):null;
      dates.forEach(function(iso){
        const r=tsxDay(iso);
        const line=empCols.map(function(f){return tsxEmpValue(emp,f.id);});
        line.push(tsxLabel(iso),r.day);
        attCols.forEach(function(f){
          const v=tsxDayValue(r,f.id);
          line.push(f.num?(v==null?'—':v):v);
        });
        sumCols.forEach(function(f){line.push(t[f.id]);});
        rows.push(line);
      });
    });
    sheets.push({name:'Daily Attendance',title:'Daily Attendance Report',meta:meta,columns:cols,rows:rows});
  }else{
    // A roll-up groups the same days by the bucket its grain names.
    const bucketOf=view==='monthly'
      ? function(iso){return iso.slice(0,7);}
      : function(iso){return iso.slice(0,4);};
    const bucketLabel=view==='monthly'
      ? function(k){const p=k.split('-');return TSX_MON_LONG[+p[1]-1]+' '+p[0];}
      : function(k){return k;};
    const order=[],seen={};
    dates.forEach(function(iso){const k=bucketOf(iso);if(!seen[k]){seen[k]=[];order.push(k);}seen[k].push(iso);});
    const cols=empCols.map(function(f){return {label:f.label,w:f.w};})
      .concat([{label:view==='monthly'?'Month':'Year',w:16}])
      .concat(sumCols.map(function(f){return {label:f.label,w:f.w,num:f.num};}));
    const rows=[];
    emps.forEach(function(emp){
      order.forEach(function(k){
        const t=tsxTotals(seen[k].map(tsxDay));
        const line=empCols.map(function(f){return tsxEmpValue(emp,f.id);});
        line.push(bucketLabel(k));
        sumCols.forEach(function(f){line.push(t[f.id]);});
        rows.push(line);
      });
    });
    sheets.push({name:view==='monthly'?'Monthly Summary':'Yearly Summary',
      title:(view==='monthly'?'Monthly':'Yearly')+' Attendance Summary',
      meta:meta,columns:cols,rows:rows});
  }

  return sheets;
}
function tsxNowLabel(){
  const d=new Date();
  let h=d.getHours(),ap=h>=12?'PM':'AM';
  h=h%12||12;
  return d.getDate()+' '+TSX_MON_SHORT[d.getMonth()]+' '+d.getFullYear()+', '+h+':'+tsxPad(d.getMinutes())+' '+ap;
}
function tsxFileName(){
  const dates=tsxDates();
  const view=tsxState.view==='daily'?'Daily':tsxState.view==='monthly'?'Monthly':'Yearly';
  const who=tsxState.scope==='my'&&tsxState.fixedEmp
    ? String(tsxState.fixedEmp.name).replace(/[^A-Za-z0-9]+/g,'_')
    : 'Attendance';
  const span=dates.length?(dates[0]+(dates.length>1?'_to_'+dates[dates.length-1]:'')):'export';
  return who+'_'+view+'_'+span+'.xlsx';
}

/* ══ THE .XLSX WRITER ══════════════════════════════════════════════════════
   Small on purpose. Two records make a zip member, one CRC table makes them
   valid, and OOXML needs five parts: content types, the package relationship,
   the workbook, its relationships, and the styles the sheets point at. */
const TSX_CRC_TABLE=(function(){
  const t=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
    t[n]=c>>>0;
  }
  return t;
})();
function tsxCrc32(buf){
  let c=0xFFFFFFFF;
  for(let i=0;i<buf.length;i++)c=TSX_CRC_TABLE[(c^buf[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
function tsxBytes(str){return new TextEncoder().encode(str);}
// STORED, not deflated: a spreadsheet of a few thousand cells is tens of KB
// either way, and this keeps the whole writer dependency-free.
function tsxZip(files){
  const enc=new TextEncoder();
  const now=new Date();
  const dosTime=((now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1))&0xFFFF;
  const dosDate=((((now.getFullYear()-1980)&0x7F)<<9)|((now.getMonth()+1)<<5)|now.getDate())&0xFFFF;
  const local=[],central=[];
  let offset=0;
  files.forEach(function(f){
    const nameB=enc.encode(f.name),data=f.data,crc=tsxCrc32(data);
    const lh=new Uint8Array(30+nameB.length),lv=new DataView(lh.buffer);
    lv.setUint32(0,0x04034b50,true);
    lv.setUint16(4,20,true);        // version needed to extract
    lv.setUint16(6,0x0800,true);    // UTF-8 filenames
    lv.setUint16(8,0,true);         // method 0 — stored
    lv.setUint16(10,dosTime,true);lv.setUint16(12,dosDate,true);
    lv.setUint32(14,crc,true);
    lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);
    lv.setUint16(26,nameB.length,true);lv.setUint16(28,0,true);
    lh.set(nameB,30);
    local.push(lh,data);
    const ch=new Uint8Array(46+nameB.length),cv=new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true);
    cv.setUint16(4,20,true);cv.setUint16(6,20,true);
    cv.setUint16(8,0x0800,true);cv.setUint16(10,0,true);
    cv.setUint16(12,dosTime,true);cv.setUint16(14,dosDate,true);
    cv.setUint32(16,crc,true);
    cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);
    cv.setUint16(28,nameB.length,true);
    cv.setUint16(30,0,true);cv.setUint16(32,0,true);cv.setUint16(34,0,true);
    cv.setUint16(36,0,true);cv.setUint32(38,0,true);
    cv.setUint32(42,offset,true);
    ch.set(nameB,46);
    central.push(ch);
    offset+=lh.length+data.length;
  });
  const cdSize=central.reduce(function(s,c){return s+c.length;},0);
  const end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);
  ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
  ev.setUint32(12,cdSize,true);ev.setUint32(16,offset,true);
  return new Blob(local.concat(central,[end]),
    {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function tsxXmlEsc(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');   // control chars are illegal in XML
}
function tsxColLetter(n){
  let s='';
  while(n>0){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26);}
  return s;
}
/* The style table the sheets index into. Kept deliberately short — five looks,
   each doing one job — and drawn from the app's own tokens so the workbook
   reads as the same product as the screen it came from. */
const TSX_STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
+'<numFmts count="1"><numFmt numFmtId="164" formatCode="0.00"/></numFmts>'
+'<fonts count="5">'
  +'<font><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/></font>'
  +'<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
  +'<font><b/><sz val="15"/><color rgb="FF0F172A"/><name val="Calibri"/></font>'
  +'<font><sz val="9"/><color rgb="FF6A7282"/><name val="Calibri"/></font>'
  +'<font><b/><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/></font>'
+'</fonts>'
+'<fills count="4">'
  +'<fill><patternFill patternType="none"/></fill>'
  +'<fill><patternFill patternType="gray125"/></fill>'
  +'<fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>'
  +'<fill><patternFill patternType="solid"><fgColor rgb="FFF8F9FB"/><bgColor indexed="64"/></patternFill></fill>'
+'</fills>'
+'<borders count="2">'
  +'<border><left/><right/><top/><bottom/><diagonal/></border>'
  +'<border>'
    +'<left style="thin"><color rgb="FFE5E7EB"/></left>'
    +'<right style="thin"><color rgb="FFE5E7EB"/></right>'
    +'<top style="thin"><color rgb="FFE5E7EB"/></top>'
    +'<bottom style="thin"><color rgb="FFE5E7EB"/></bottom>'
    +'<diagonal/></border>'
+'</borders>'
+'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
+'<cellXfs count="8">'
  +'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'                                                                    /* 0 plain      */
  +'<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'                                                      /* 1 title      */
  +'<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'                                                      /* 2 meta       */
  +'<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">'
    +'<alignment horizontal="left" vertical="center" wrapText="1"/></xf>'                                                              /* 3 header     */
  +'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">'
    +'<alignment vertical="center"/></xf>'                                                                                             /* 4 text       */
  +'<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1">'
    +'<alignment horizontal="right" vertical="center"/></xf>'                                                                          /* 5 number     */
  +'<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">'
    +'<alignment vertical="center"/></xf>'                                                                                             /* 6 text band  */
  +'<xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1">'
    +'<alignment horizontal="right" vertical="center"/></xf>'                                                                          /* 7 num band   */
+'</cellXfs>'
+'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
+'</styleSheet>';

const TSX_S={title:1,meta:2,head:3,text:4,num:5,textBand:6,numBand:7};

function tsxCell(ref,style,value,isNum){
  if(isNum)return '<c r="'+ref+'" s="'+style+'"><v>'+value+'</v></c>';
  return '<c r="'+ref+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'
    +tsxXmlEsc(value)+'</t></is></c>';
}
/* A sheet is a title, two lines of provenance, a blank, then the table. The
   provenance lines matter more than they look: a spreadsheet that has been
   mailed on twice has no other way of saying which entity, which period and
   which report shape produced it. */
function tsxSheetXml(sheet){
  const cols=sheet.columns,nCols=cols.length;
  const last=tsxColLetter(nCols);
  const headRow=sheet.meta.length+3;
  const firstData=headRow+1;
  let xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    +'<dimension ref="A1:'+last+Math.max(firstData,firstData+sheet.rows.length-1)+'"/>'
    +'<sheetViews><sheetView showGridLines="0" workbookViewId="0">'
      +'<pane ySplit="'+headRow+'" topLeftCell="A'+firstData+'" activePane="bottomLeft" state="frozen"/>'
    +'</sheetView></sheetViews>'
    +'<sheetFormatPr defaultRowHeight="15"/>';
  xml+='<cols>';
  cols.forEach(function(c,i){
    xml+='<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(c.w||16)+'" customWidth="1"/>';
  });
  xml+='</cols><sheetData>';

  xml+='<row r="1" ht="21" customHeight="1">'+tsxCell('A1',TSX_S.title,sheet.title)+'</row>';
  sheet.meta.forEach(function(line,i){
    xml+='<row r="'+(i+2)+'">'+tsxCell('A'+(i+2),TSX_S.meta,line)+'</row>';
  });
  xml+='<row r="'+(headRow-1)+'"/>';
  xml+='<row r="'+headRow+'" ht="26" customHeight="1">';
  cols.forEach(function(c,i){
    xml+=tsxCell(tsxColLetter(i+1)+headRow,TSX_S.head,c.label);
  });
  xml+='</row>';
  sheet.rows.forEach(function(row,ri){
    const r=firstData+ri,band=ri%2===1;
    xml+='<row r="'+r+'">';
    row.forEach(function(v,ci){
      const numeric=cols[ci].num&&typeof v==='number'&&isFinite(v);
      const style=numeric?(band?TSX_S.numBand:TSX_S.num):(band?TSX_S.textBand:TSX_S.text);
      xml+=tsxCell(tsxColLetter(ci+1)+r,style,v,numeric);
    });
    xml+='</row>';
  });
  xml+='</sheetData>';
  // autoFilter must sit after sheetData and before mergeCells — that is the
  // order the schema declares, and Excel repairs the file if it does not.
  if(sheet.rows.length)xml+='<autoFilter ref="A'+headRow+':'+last+(firstData+sheet.rows.length-1)+'"/>';
  xml+='<mergeCells count="'+(1+sheet.meta.length)+'">'
    +'<mergeCell ref="A1:'+last+'1"/>';
  sheet.meta.forEach(function(l,i){xml+='<mergeCell ref="A'+(i+2)+':'+last+(i+2)+'"/>';});
  xml+='</mergeCells>';
  xml+='<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>';
  xml+='</worksheet>';
  return xml;
}
// Excel forbids : \ / ? * [ ] in a tab name and caps it at 31 characters.
function tsxTabName(name,i){
  const clean=String(name).replace(/[\\\/\?\*\[\]:]/g,' ').slice(0,31).trim();
  return clean||('Sheet'+(i+1));
}
function tsxWorkbook(sheets){
  const files=[];
  const types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    +'<Default Extension="xml" ContentType="application/xml"/>'
    +'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    +sheets.map(function(s,i){
      return '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    }).join('')
    +'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    +'</Types>';
  const rootRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    +'</Relationships>';
  const wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    +' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
    +sheets.map(function(s,i){
      return '<sheet name="'+tsxXmlEsc(tsxTabName(s.name,i))+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>';
    }).join('')
    +'</sheets></workbook>';
  const wbRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    +sheets.map(function(s,i){
      return '<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>';
    }).join('')
    +'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    +'</Relationships>';
  files.push({name:'[Content_Types].xml',data:tsxBytes(types)});
  files.push({name:'_rels/.rels',data:tsxBytes(rootRels)});
  files.push({name:'xl/workbook.xml',data:tsxBytes(wb)});
  files.push({name:'xl/_rels/workbook.xml.rels',data:tsxBytes(wbRels)});
  files.push({name:'xl/styles.xml',data:tsxBytes(TSX_STYLES)});
  sheets.forEach(function(s,i){
    files.push({name:'xl/worksheets/sheet'+(i+1)+'.xml',data:tsxBytes(tsxSheetXml(s))});
  });
  return tsxZip(files);
}
function tsxSave(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;a.style.display='none';
  document.body.appendChild(a);
  a.click();
  // Revoking immediately can cut the download off in Safari, so the tidy-up
  // waits a turn rather than racing the browser to the file it just started.
  setTimeout(function(){a.remove();URL.revokeObjectURL(url);},1500);
}

/* ══ RUNNING IT ════════════════════════════════════════════════════════════
   Everything that can make the file meaningless is checked BEFORE the writer
   is touched, and each refusal names the section that fixes it — an export
   that silently produces an empty workbook is worse than one that will not
   run. */
function tsxRun(){
  const emps=tsxSelectedEmps();
  if(!emps.length){showToast('Pick at least one employee','error','Section 1 — Employee Selection');return;}
  const dates=tsxDates();
  if(!dates.length){showToast('Pick a period to export','error','Section 3 — Period Selection');return;}
  /* A sheet needs at least one column that is not its own spine. Date and Day
     (or Month / Year) are always written, so "nothing ticked" would still
     produce a file — a column of dates and nothing else, which is a file
     nobody asked for. Only the groups the current report shape can use count
     towards this, which is why the test names them rather than counting
     everything ticked. */
  const usable=tsxActiveFields('emp').length
    +tsxActiveFields('sum').length
    +(tsxState.view==='daily'?tsxActiveFields('att').length:0);
  if(!usable){showToast('Pick at least one column','error','Section 4 — Select Data to Export');return;}
  let blob,name;
  try{
    const sheets=tsxBuildSheets();
    if(!sheets.length||!sheets[0].rows.length){showToast('Nothing to export for this selection','error');return;}
    blob=tsxWorkbook(sheets);
    name=tsxFileName();
  }catch(err){
    console.error('Timesheet export failed',err);
    showToast('Export failed','error','Could not build the workbook.');
    return;
  }
  tsxSave(blob,name);
  const rows=tsxCounts();
  showToast('Excel export ready','success',
    name+' — '+rows.rows+' row'+(rows.rows===1?'':'s')+', '+rows.cols+' column'+(rows.cols===1?'':'s'));
  tsxClose();
}
// What the footer promises and the toast confirms — one calculation, so they
// can never quote different numbers for the same file.
function tsxCounts(){
  const emps=tsxSelectedEmps().length;
  const dates=tsxDates();
  let buckets=dates.length;
  if(tsxState.view==='monthly'||tsxState.view==='yearly'){
    const cut=tsxState.view==='monthly'?7:4,seen={};
    buckets=0;
    dates.forEach(function(d){const k=d.slice(0,cut);if(!seen[k]){seen[k]=1;buckets++;}});
  }
  const cols=tsxActiveFields('emp').length+tsxActiveFields('sum').length
    +(tsxState.view==='daily'?2+tsxActiveFields('att').length:1);
  return {emps:emps,days:dates.length,buckets:buckets,rows:emps*buckets,cols:cols};
}

/* ══ THE PANEL ═════════════════════════════════════════════════════════════
   Appended to the body rather than rendered into the page, for one reason: a
   tick should not repaint the timesheet behind it. The four sections repaint
   themselves individually, so the drawer never loses its scroll position or
   replays its entrance while it is being filled in. */
const TSX_ICO={
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  sheet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>'
};

/* Seeded from the filter the page is already showing — see the header note. */
function tsxSeedPeriod(){
  const s=tsxState;
  s.period='range';s.multi=[];
  if(s.scope==='all'&&typeof atPeriod==='function'){
    const p=atPeriod();
    s.from=p.from;s.to=p.to;
  }else if(typeof tsRange!=='undefined'&&tsRange){
    s.from=tsRange.from;s.to=tsRange.to;
  }else{
    const t=tsxParse(tsxToday())||new Date();
    s.from=tsxISO(new Date(t.getFullYear(),t.getMonth(),1));
    s.to=tsxISO(new Date(t.getFullYear(),t.getMonth()+1,0));
  }
  s.single=s.from;
}
function tsxOpen(scope){
  tsxClose();
  const s=tsxState;
  s.scope=scope==='all'?'all':'my';
  s.empListOpen=false;s.empQuery='';
  if(s.scope==='my'){
    s.fixedEmp=tsxScreenEmp();
    s.emps=s.fixedEmp?[s.fixedEmp.empId]:[];
  }else{
    s.fixedEmp=null;
    s.emps=tsxRoster().map(function(e){return e.empId;});
  }
  tsxSeedPeriod();
  s.open=true;
  const host=document.createElement('div');
  host.id='tsx-host';
  host.innerHTML=tsxPanelHTML();
  document.body.appendChild(host);
  document.addEventListener('keydown',tsxKey);
  const close=document.getElementById('tsx-close');
  if(close)close.focus();
}
function tsxClose(){
  const host=document.getElementById('tsx-host');
  if(host)host.remove();
  tsxState.open=false;
  document.removeEventListener('keydown',tsxKey);
}
// Escape belongs to whatever is on top: with a date picker open over the
// drawer it closes the picker and leaves the half-built export alone.
function tsxKey(e){
  if(e.key!=='Escape')return;
  if(document.querySelector('.cd-panel.cd-open')){if(typeof cdCloseAll==='function')cdCloseAll();return;}
  tsxClose();
}

function tsxPanelHTML(){
  return '<div class="tsx-overlay">'
    +'<div class="tsx-bg" onclick="tsxClose()"></div>'
    +'<aside class="tsx-panel" role="dialog" aria-modal="true" aria-labelledby="tsx-title">'
      +'<header class="tsx-head">'
        +'<div class="tsx-head-txt">'
          +'<h2 class="tsx-title" id="tsx-title">Export Attendance</h2>'
          +'<p class="tsx-sub">Choose who, what period and which columns. The file is a real Excel workbook.</p>'
        +'</div>'
        +'<button class="tsx-close" id="tsx-close" onclick="tsxClose()" title="Close" aria-label="Close">'+TSX_ICO.close+'</button>'
      +'</header>'
      +'<div class="tsx-body" id="tsx-body">'
        +tsxSectionHTML(1,'Employee Selection','tsx-sec-emp',tsxSecEmpHTML())
        +tsxSectionHTML(2,'Report View','tsx-sec-view',tsxSecViewHTML())
        +tsxSectionHTML(3,'Period Selection','tsx-sec-period',tsxSecPeriodHTML())
        +tsxSectionHTML(4,'Select Data to Export','tsx-sec-fields',tsxSecFieldsHTML())
        +'<div class="tsx-note">'+TSX_ICO.info
          +'<span>Only the employees, period and columns selected above are written to the file. '
          +'Weekly offs come from the calendar and holidays from this entity&rsquo;s holiday list.</span></div>'
      +'</div>'
      +'<footer class="tsx-foot">'
        +'<span class="tsx-foot-note" id="tsx-foot-note">'+tsxFootNote()+'</span>'
        +'<div class="tsx-foot-btns">'
          +'<button class="tsx-cancel" onclick="tsxClose()">Cancel</button>'
          +'<button class="tsx-export" onclick="tsxRun()">'+TSX_ICO.download+'Export Excel</button>'
        +'</div>'
      +'</footer>'
    +'</aside>'
  +'</div>';
}
function tsxSectionHTML(n,label,id,body){
  return '<section class="tsx-sec">'
    +'<div class="tsx-sec-head"><span class="tsx-step">'+n+'</span>'
      +'<span class="tsx-sec-label">'+label+'</span></div>'
    +'<div class="tsx-sec-body" id="'+id+'">'+body+'</div>'
  +'</section>';
}

// ── 1 · Employee Selection ──
function tsxSecEmpHTML(){
  const s=tsxState;
  if(s.scope==='my'){
    const e=s.fixedEmp;
    if(!e)return '<p class="tsx-hint">No employee on this view.</p>';
    return '<div class="tsx-emp-fixed">'
      +'<span class="tsx-emp-av">'+tsxHtml(tsxInitials(e.name))+'</span>'
      +'<span class="tsx-emp-fixed-txt"><span class="tsx-emp-name">'+tsxHtml(e.name)+'</span>'
        +'<span class="tsx-emp-meta">'+tsxHtml(e.role||'Employee')+' · '+tsxHtml(e.empId)+'</span></span>'
    +'</div>'
    +'<p class="tsx-hint">This view holds one person&rsquo;s record, so the export is theirs. '
      +'Use All Timesheet to export several at once.</p>';
  }
  const roster=tsxRoster();
  const picked=tsxSelectedEmps();
  const shown=picked.slice(0,3),extra=picked.length-shown.length;
  const chips=picked.length
    ? '<div class="ep-emp-tags tsx-chips">'
      +shown.map(function(e){
        return '<span class="ep-emp-tag">'+tsxHtml(e.name)
          +'<button type="button" onclick="tsxRemoveEmp(\''+tsxAttr(e.empId)+'\')" '
          +'title="Remove '+tsxAttr(e.name)+'" aria-label="Remove '+tsxAttr(e.name)+'">&times;</button></span>';
      }).join('')
      +(extra>0?'<span class="tsx-chip-more">+'+extra+' more</span>':'')
      +'</div>'
    : '';
  return '<button type="button" class="tsx-field'+(s.empListOpen?' is-open':'')
      +(picked.length?'':' is-empty')+'" onclick="tsxToggleEmpList()">'
      +'<span>'+(picked.length?picked.length+' of '+roster.length+' employees selected':'Select employee(s)')+'</span>'
      +'<span class="tsx-field-chev">'+TSX_ICO.chev+'</span>'
    +'</button>'
    +(s.empListOpen?tsxEmpListHTML():'')
    +chips;
}
function tsxEmpListHTML(){
  const roster=tsxRoster();
  const all=tsxState.emps.length===roster.length&&roster.length>0;
  return '<div class="tsx-emp-list">'
    +'<div class="emp-sel-search tsx-emp-search">'+TSX_ICO.search
      +'<input type="text" placeholder="Search employees" value="'+tsxAttr(tsxState.empQuery)+'" '
      +'oninput="tsxEmpSearch(this.value)" autocomplete="off">'
    +'</div>'
    +'<div class="tsx-emp-bulk">'
      +'<button type="button" onclick="tsxAllEmps('+(all?'false':'true')+')">'
        +(all?'Clear all':'Select all')+'</button>'
      +'<span>'+tsxState.emps.length+' selected</span>'
    +'</div>'
    +'<div class="tsx-emp-options" id="tsx-emp-options">'+tsxEmpOptionsHTML()+'</div>'
  +'</div>';
}
function tsxEmpOptionsHTML(){
  const q=String(tsxState.empQuery||'').toLowerCase().trim();
  const rows=tsxRoster().filter(function(e){
    return !q||e.name.toLowerCase().indexOf(q)>=0||String(e.empId).indexOf(q)>=0;
  });
  if(!rows.length)return '<div class="tsx-empty">No employee matches &ldquo;'+tsxHtml(tsxState.empQuery)+'&rdquo;</div>';
  return rows.map(function(e){
    const on=tsxState.emps.indexOf(e.empId)>=0;
    return '<button type="button" class="tsx-emp-opt'+(on?' is-on':'')+'" '
      +'onclick="tsxToggleEmp(\''+tsxAttr(e.empId)+'\')">'
      +'<span class="tsx-box">'+TSX_ICO.check+'</span>'
      +'<span class="tsx-emp-av sm">'+tsxHtml(tsxInitials(e.name))+'</span>'
      +'<span class="tsx-emp-opt-txt"><span class="tsx-emp-name">'+tsxHtml(e.name)+'</span>'
        +'<span class="tsx-emp-meta">'+tsxHtml(e.empId)+' · '+tsxHtml(e.role||'Employee')+'</span></span>'
      +'<span class="tsx-emp-state '+(e.tsStatus==='Filled'?'ok':'bad')+'">'+tsxHtml(e.tsStatus||'')+'</span>'
    +'</button>';
  }).join('');
}
function tsxInitials(name){
  return String(name||'').trim().split(/\s+/).slice(0,2)
    .map(function(p){return p.charAt(0).toUpperCase();}).join('')||'?';
}

// ── 2 · Report View ──
function tsxSecViewHTML(){
  return '<div class="tsx-choices">'+TSX_VIEWS.map(function(v){
    const on=tsxState.view===v.id;
    return '<button type="button" class="tsx-choice'+(on?' is-on':'')+'" onclick="tsxSetView(\''+v.id+'\')">'
      +'<span class="tsx-radio"></span>'
      +'<span class="tsx-choice-txt"><span class="tsx-choice-label">'+v.label+'</span>'
        +'<span class="tsx-choice-sub">'+v.sub+'</span></span>'
    +'</button>';
  }).join('')+'</div>';
}

// ── 3 · Period Selection ──
function tsxSecPeriodHTML(){
  const s=tsxState;
  const seg=[['single','Single Date'],['multi','Multiple Dates'],['range','Date Range']].map(function(p){
    return '<button type="button" class="tsx-seg'+(s.period===p[0]?' is-on':'')+'" '
      +'onclick="tsxSetPeriod(\''+p[0]+'\')">'+p[1]+'</button>';
  }).join('');
  let fields='';
  if(s.period==='single'){
    fields='<div class="tsx-flds one"><label class="tsx-fld">'
      +'<span class="tsx-fld-lbl">Date</span>'+apCD('tsx-d-single',s.single,'Select date','tsxPickSingle')
      +'</label></div>';
  }else if(s.period==='multi'){
    const chips=s.multi.length
      ? '<div class="ep-emp-tags tsx-chips">'+s.multi.map(function(d){
          return '<span class="ep-emp-tag">'+tsxLabel(d)
            +'<button type="button" onclick="tsxRemoveDate(\''+d+'\')" '
            +'title="Remove '+tsxAttr(tsxLabel(d))+'" aria-label="Remove '+tsxAttr(tsxLabel(d))+'">&times;</button></span>';
        }).join('')+'</div>'
      : '<p class="tsx-hint">No dates added yet — pick one above to start the list.</p>';
    fields='<div class="tsx-flds one"><label class="tsx-fld">'
      +'<span class="tsx-fld-lbl">Add a date</span>'+apCD('tsx-d-add','','Pick a date to add','tsxPickAdd')
      +'</label></div>'+chips;
  }else{
    fields='<div class="tsx-flds"><label class="tsx-fld">'
      +'<span class="tsx-fld-lbl">From date</span>'+apCD('tsx-d-from',s.from,'From','tsxPickFrom')
      +'</label><label class="tsx-fld">'
      +'<span class="tsx-fld-lbl">To date</span>'+apCD('tsx-d-to',s.to,'To','tsxPickTo')
      +'</label></div>';
  }
  return '<div class="tsx-segs">'+seg+'</div>'+fields;
}

// ── 4 · Select Data to Export ──
function tsxSecFieldsHTML(){
  return TSX_GROUPS.map(function(g){
    const live=tsxGroupLive(g);
    const on=tsxGroupCount(g);
    const all=on===g.fields.length;
    /* The note is the whole reason a group can be greyed: it says which
       question the columns answer, so an unavailable group reads as a
       consequence of the report shape rather than a broken control. */
    let note='';
    if(!live)note='Per-day columns — only in the day-wise report.';
    else if(g.id==='sum'&&tsxState.view==='daily')note='Period totals for the employee, repeated on each of their rows.';
    return '<div class="tsx-grp'+(live?'':' is-off')+'" data-grp="'+g.id+'">'
      +'<div class="tsx-grp-head">'
        +'<span class="tsx-grp-label">'+g.label+'</span>'
        +'<span class="tsx-grp-count">'+on+'/'+g.fields.length+'</span>'
        +(live?'<button type="button" class="tsx-grp-all" onclick="tsxGroupAll(\''+g.id+'\','+(all?'false':'true')+')">'
          +(all?'Clear':'All')+'</button>':'')
      +'</div>'
      +(note?'<p class="tsx-grp-note">'+note+'</p>':'')
      +'<div class="tsx-checks">'+g.fields.map(function(f){
        const ticked=!!tsxState.fields[f.id];
        return '<button type="button" class="tsx-check'+(ticked?' is-on':'')+'"'
          +(live?' onclick="tsxToggleField(\''+f.id+'\',this)"':' disabled')+'>'
          +'<span class="tsx-box">'+TSX_ICO.check+'</span><span>'+f.label+'</span></button>';
      }).join('')+'</div>'
    +'</div>';
  }).join('');
}

// ── Footer ──
/* It says what the button will actually produce. A drawer of forty controls
   with no read-out is a form you press hopefully; with one it is a decision. */
function tsxFootNote(){
  const c=tsxCounts();
  if(!c.emps)return 'No employee selected';
  if(!c.days)return 'No period selected';
  const grain=tsxState.view==='daily'?(c.days+' day'+(c.days===1?'':'s'))
    :tsxState.view==='monthly'?(c.buckets+' month'+(c.buckets===1?'':'s'))
    :(c.buckets+' year'+(c.buckets===1?'':'s'));
  return c.emps+' employee'+(c.emps===1?'':'s')+' · '+grain+' · '
    +c.rows+' row'+(c.rows===1?'':'s')+' · '+c.cols+' column'+(c.cols===1?'':'s')+' · 1 sheet';
}

// ── Targeted repaints ──
// Each one owns a single section, so nothing else on the drawer flickers,
// re-animates, or loses what it was in the middle of.
function tsxSet(id,html){const el=document.getElementById(id);if(el)el.innerHTML=html;}
function tsxPaintEmp(){tsxSet('tsx-sec-emp',tsxSecEmpHTML());}
function tsxPaintView(){tsxSet('tsx-sec-view',tsxSecViewHTML());}
function tsxPaintPeriod(){tsxSet('tsx-sec-period',tsxSecPeriodHTML());}
function tsxPaintFields(){tsxSet('tsx-sec-fields',tsxSecFieldsHTML());}
function tsxPaintFoot(){
  const el=document.getElementById('tsx-foot-note');
  if(el)el.textContent=tsxFootNote();
}

// The button that opens all of the above, for the two timesheet toolbars.
function tsxExportBtn(scope){
  return '<button type="button" class="tsx-open-btn" onclick="tsxOpen(\''+scope+'\')" '
    +'title="Export attendance to Excel">'+TSX_ICO.download+'Export</button>';
}
